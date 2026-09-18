import database from '#/database'
import FinancialRecord from '#/database/models/financialRecord'
import Inventory from '#/database/models/inventory'
import Order from '#/database/models/order'
import OrderDetail from '#/database/models/orderDetail'
import OrderReturn from '#/database/models/orderReturn'
import Product from '#/database/models/product'
import ProductVariant from '#/database/models/productVariant'
import { IRequestLocal } from '#/types/common'
import { applyCodeFormat, getCodeFormat } from '#/utils/code-generator'
import { assertVendorAccess, assertWarehouseAccess, getVendorScope, TVendorScope } from '#/utils/tenant'
import { Request } from 'express'
import { IncludeOptions, Op, Optional, Transaction } from 'sequelize'
import { SettingService } from '../setting'
import { TransferService } from '../transfer'
import { getPagination } from '#/utils'
import { ApiError } from '#/response'
import ProductAttributeValue from '#/database/models/productAttributeValue'
import ProductAttribute from '#/database/models/productAttribute'
import { InvoiceService } from '../invoice'
import { evictCachedEntity } from '#/utils/entity-cache'

type OrderChannel = 'POS' | 'WHOLESALE' | 'ONLINE'

const ORDER_TYPE_IMPORT = '0'
const ORDER_TYPE_SALE = '1'
const DEFAULT_ORDER_CHANNEL: OrderChannel = 'WHOLESALE'
const SUPPORTED_ORDER_CHANNELS: readonly OrderChannel[] = ['POS', 'WHOLESALE', 'ONLINE']

interface IOrderQueryParams {
  page?: number | string
  pageSize?: number | string
  isProvider?: boolean
  vendorId?: number | string
  warehouseId?: number | string
}
interface IOrderCreateParams {
  price?: number | string
  VAT?: number | string
  surcharge?: number | string
  type?: string
  orderDetails: any[]
  paid: number | string
  paymentType: 'cash' | 'transfer' | 'credit'
  channel?: OrderChannel
  warehouseId: number | string
  providerId: number | string
  vendorId: number | string
  staffId?: number
  customerId?: number
  createdAt?: string | Date
  transactionDate?: string | Date
}

interface IOrderDetailCreateParams {
  name: string
  quantity: number
  productId: number
  variantId: number
  warehouseId: number
  orderId: number
  price: number
  buyPrice: number
  note: string
  type: string
  transaction: Transaction
}

interface IInventoryUpdateParams {
  productId: number
  variantId: number
  warehouseId: number
  quantity: number
  transaction: Transaction
  type?: string
}

interface IProductUpdateParams {
  quantity: number
  productId: number
  variantId: number
  transaction: Transaction
  type?: string
}

interface ICreateTransferParams {
  transaction: Transaction
  warehouseId?: number
  fromWarehouseId?: number
  toWarehouseId?: number
  quantity: number
  productId: number
  variantId: number
  type?: string
}

interface OrderTotals {
  totalPrice: number
  totalPayable: number
}

interface OrderLineQuantity {
  productId: number
  variantId: number
  quantity: number
}

interface StockCatalog {
  productById: Map<number, any>
  variantById: Map<number, any>
}

export default class OrderService {
  sequelize = database.sequelize

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  async create(
    {
      VAT: vatInput,
      surcharge: surchargeInput,
      paymentType,
      channel: requestedChannel = DEFAULT_ORDER_CHANNEL,
      warehouseId: warehouseIdInput,
      providerId,
      orderDetails: orderLines,
      type: requestedType = ORDER_TYPE_SALE,
      vendorId: vendorIdInput,
      staffId,
      customerId,
      createdAt: createdAtInput,
      transactionDate
    }: IOrderCreateParams,
    /** Multi-tenant scope from auth middleware (null = platform admin). */
    vendorScope: TVendorScope = null
  ) {
    assertVendorAccess(vendorScope, Number(vendorIdInput), 'Unauthorized to create orders for this vendor')

    const orderType = this.resolveOrderType(providerId, requestedType)
    const orderTotals = this.calculateOrderTotals(orderLines, surchargeInput, vatInput)
    const orderChannel = this.resolveOrderChannel(requestedChannel)
    const warehouseId = Number(warehouseIdInput)
    const vendorId = Number(vendorIdInput)

    const orderAttributes = this.buildNewOrderAttributes({
      vatInput,
      surchargeInput,
      paymentType,
      orderChannel,
      warehouseId,
      vendorId,
      staffId,
      customerId,
      providerId,
      createdAtInput,
      orderTotals
    })

    const transaction = await this.sequelize.transaction()
    try {
      const createdOrder = await this.persistOrderWithGeneratedCode(orderAttributes, vendorId, transaction)

      await this.validateSaleStockAvailability({
        orderLines,
        warehouseId,
        orderType,
        transaction
      })

      await this.persistAllOrderDetails({
        orderLines,
        warehouseId,
        orderId: (createdOrder as any).id,
        orderType,
        transaction
      })

      await this.createImportExpenseVoucherIfNeeded({
        order: createdOrder,
        warehouseId,
        transaction,
        transactionDate: transactionDate ? new Date(transactionDate as any) : undefined,
        createdAtInput
      })

      await this.attemptCreateInvoice({ order: createdOrder, transaction })

      await transaction.commit()
      return createdOrder
    } catch (error) {
      console.log('error', error)
      await transaction.rollback()
      throw ApiError.from(error, 400)
    }
  }

  private resolveOrderType(providerId: number | string | undefined | null, requestedType: string): string {
    // Imports (providerId set) are inbound stock, sales are outbound.
    if (providerId != null) return ORDER_TYPE_IMPORT
    return requestedType
  }

  private calculateOrderTotals(
    orderLines: any[],
    surchargeInput: number | string | undefined,
    vatInput: number | string | undefined
  ): OrderTotals {
    const linesTotal = orderLines.reduce((runningTotal, line) => runningTotal + Number(line.buyPrice), 0)
    const totalPrice = linesTotal + Number(surchargeInput)
    const totalPayable = Number(totalPrice + (totalPrice / 100) * Number(vatInput))
    return { totalPrice, totalPayable }
  }

  private resolveOrderChannel(requestedChannel: OrderChannel): OrderChannel {
    if ((SUPPORTED_ORDER_CHANNELS as readonly string[]).includes(requestedChannel as string)) {
      return requestedChannel as OrderChannel
    }
    return DEFAULT_ORDER_CHANNEL
  }

  private buildNewOrderAttributes(params: {
    vatInput: number | string | undefined
    surchargeInput: number | string | undefined
    paymentType: 'cash' | 'transfer' | 'credit'
    orderChannel: OrderChannel
    warehouseId: number
    vendorId: number
    staffId?: number
    customerId?: number
    providerId: number | string
    createdAtInput?: string | Date
    orderTotals: OrderTotals
  }): Partial<Omit<Order, 'id'>> & { createdAt?: Date; updatedAt?: Date } {
    const {
      vatInput,
      surchargeInput,
      paymentType,
      orderChannel,
      warehouseId,
      vendorId,
      staffId,
      customerId,
      providerId,
      createdAtInput,
      orderTotals
    } = params

    const orderAttributes: Partial<Omit<Order, 'id'>> & { createdAt?: Date; updatedAt?: Date } = {
      VAT: Number(vatInput),
      surcharge: Number(surchargeInput),
      paid: orderTotals.totalPayable,
      price: orderTotals.totalPrice,
      paymentType,
      channel: orderChannel,
      warehouseId,
      vendorId,
      staffId,
      customerId
    }

    // Allow callers to backdate orders.
    if (createdAtInput) {
      const backdatedAt = new Date(createdAtInput)
      if (!isNaN(backdatedAt.getTime())) {
        orderAttributes.createdAt = backdatedAt
        orderAttributes.updatedAt = backdatedAt
      }
    }

    if (providerId) {
      orderAttributes.providerId = Number(providerId)
    }

    return orderAttributes
  }

  private async persistOrderWithGeneratedCode(
    orderAttributes: Partial<Omit<Order, 'id'>> & { createdAt?: Date; updatedAt?: Date },
    vendorId: number,
    transaction: Transaction
  ): Promise<Order> {
    const orderBuilder = Order.build(orderAttributes as Optional<Order, 'id'>)
    const createdOrder = await orderBuilder.save({ transaction })

    // If a custom createdAt was supplied, force it (sequelize may overwrite on save).
    if ((orderAttributes as any).createdAt) {
      const backdatedAt = (orderAttributes as any).createdAt as Date
      await createdOrder.update({ createdAt: backdatedAt, updatedAt: backdatedAt } as any, { transaction })
    }

    const generatedCode = await this.getOrderCode(String((createdOrder as any).id), String(vendorId ?? ''))
    if (generatedCode) (createdOrder as any).code = generatedCode
    await createdOrder.save({ transaction })

    return createdOrder
  }

  private async validateSaleStockAvailability(params: {
    orderLines: any[]
    warehouseId: number
    orderType: string
    transaction: Transaction
  }): Promise<void> {
    const { orderLines, warehouseId, orderType, transaction } = params
    // Imports add stock, so only sales need an availability pre-check.
    // The atomic decrement below is still the source of truth — this gives an
    // early error naming the offending product instead of a generic one.
    if (orderType === ORDER_TYPE_IMPORT) return

    const productIds = [...new Set(orderLines.map((line: any) => Number(line.productId)))].filter(Boolean)
    const variantIds = orderLines
      .map((line: any) => (line.variantId != null ? Number(line.variantId) : null))
      .filter((variantId: number | null): variantId is number => variantId != null)

    const stockCatalog = await this.fetchProductCatalogForStockCheck(productIds, variantIds, transaction)
    const warehouseStockRows = await this.fetchWarehouseStockLevels(productIds, warehouseId, transaction)

    this.assertEachSaleLineHasStock(orderLines, warehouseStockRows, stockCatalog, transaction)
  }

  private async fetchProductCatalogForStockCheck(
    productIds: number[],
    variantIds: number[],
    transaction: Transaction
  ): Promise<StockCatalog> {
    const productRows: any[] = productIds.length
      ? await Product.findAll({
          where: { id: { [Op.in]: productIds } },
          // Sellability/oversell policy is variant-level now.  The
          // variant-only migration removes isNegative from products.
          attributes: ['id', 'name'],
          transaction
        })
      : []
    const variantRows: any[] = variantIds.length
      ? await ProductVariant.findAll({
          where: { id: { [Op.in]: variantIds } },
          attributes: ['id', 'skuCode', 'isNegative'],
          transaction
        })
      : []

    return {
      productById: new Map(productRows.map((productRow) => [Number(productRow.get('id')), productRow])),
      variantById: new Map(variantRows.map((variantRow) => [Number(variantRow.get('id')), variantRow]))
    }
  }

  private async fetchWarehouseStockLevels(
    productIds: number[],
    warehouseId: number,
    transaction: Transaction
  ): Promise<any[]> {
    if (!productIds.length) return []
    return Inventory.findAll({ where: { productId: { [Op.in]: productIds }, warehouseId }, transaction })
  }

  private findAvailableQuantity(warehouseStockRows: any[], productId: number, variantId: number): number {
    const matchingStockRow = warehouseStockRows.find(
      (stockRow: any) =>
        Number(stockRow.get('productId')) === productId &&
        Number(stockRow.get('variantId')) === variantId
    )
    return Number(matchingStockRow?.get('quantity') ?? 0)
  }

  private async assertEachSaleLineHasStock(
    orderLines: any[],
    warehouseStockRows: any[],
    stockCatalog: StockCatalog,
    transaction: Transaction
  ): Promise<void> {
    for (const orderLine of orderLines) {
      const requestedQuantity = Number(orderLine.quantity ?? 0)
      if (requestedQuantity <= 0) continue

      const productRow = stockCatalog.productById.get(Number(orderLine.productId))
      if (!productRow) {
        await this.throwForMissingSaleProduct(Number(orderLine.productId), transaction)
      }

      if (orderLine.variantId == null) throw new Error('variantId is required')
      const variantRow = stockCatalog.variantById.get(Number(orderLine.variantId))
      if (!variantRow) throw new Error(`Variant ${orderLine.variantId} not found`)
      const allowsOversell = Boolean(variantRow.get('isNegative'))
      if (allowsOversell) continue

      const availableQuantity = this.findAvailableQuantity(
        warehouseStockRows,
        Number(orderLine.productId),
        Number(orderLine.variantId)
      )
      if (availableQuantity < requestedQuantity) {
        const productLabel = variantRow
          ? `${productRow.get('name')} [${variantRow.get('skuCode')}]`
          : String(productRow.get('name'))
        throw new Error(
          `Sản phẩm "${productLabel}" không đủ tồn kho (cần ${requestedQuantity}, còn ${availableQuantity}). Chỉ định isNegative để cho phép bán âm.`
        )
      }
    }
  }

  private async throwForMissingSaleProduct(productId: number, transaction: Transaction): Promise<never> {
    const softDeletedProduct = await Product.findByPk(productId, { paranoid: false, transaction } as any)
    if (softDeletedProduct) throw new Error(`Product ${productId} is deleted/discontinued and cannot be sold`)
    throw new Error(`Product ${productId} not found`)
  }

  private async persistAllOrderDetails(params: {
    orderLines: any[]
    warehouseId: number
    orderId: number
    orderType: string
    transaction: Transaction
  }): Promise<void> {
    const { orderLines, warehouseId, orderId, orderType, transaction } = params
    const detailPersistenceTasks = orderLines.map((orderLine) =>
      this.createOrderDetails({ transaction, warehouseId, orderId, type: orderType, ...orderLine })
    )
    await Promise.all(detailPersistenceTasks)
  }

  private async createImportExpenseVoucherIfNeeded(params: {
    order: Order
    warehouseId: number
    transaction: Transaction
    transactionDate?: Date
    createdAtInput?: string | Date
  }): Promise<void> {
    const { order, warehouseId, transaction, transactionDate, createdAtInput } = params
    // Sales revenue is booked when the invoice is issued/paid, not on Order.
    if ((order as any).providerId == null) return

    const resolvedTransactionDate = transactionDate ?? (createdAtInput ? new Date(createdAtInput as any) : undefined)
    await this.createFinancialVoucher({
      order,
      warehouseId,
      transaction,
      transactionDate: resolvedTransactionDate
    })
  }

  /**
   * Create a new order detail.
   * @param {Object} params - contains order detail creation information
   * @param {string} params.name - product name
   * @param {number} params.quantity - product quantity
   * @param {number} params.productId - product ID
   * @param {number} params.warehouseId - warehouse ID
   * @param {Transaction} params.transaction - transaction object
   * @param {number} params.orderId - order ID
   * @param {string} params.type - order type, can be "1" or "0", default is "1"
   * @returns {Promise<Array<Object>>} - a Promise that resolves to an array of created order details, updated inventory and product quantity
   *
   * This function creates a new order detail and updates the inventory, product quantity and creates a new transfer.
   */
  async createOrderDetails({
    name,
    quantity,
    productId,
    variantId,
    warehouseId,
    orderId,
    type,
    note,
    transaction,
    ...orderDetail
  }: IOrderDetailCreateParams) {
    await this.persistOrderDetailRow({
      name,
      quantity,
      productId,
      variantId,
      warehouseId,
      orderId,
      note,
      transaction,
      extraAttributes: orderDetail
    })
    await this.propagateOrderDetailStockChanges({ quantity, productId, variantId, warehouseId, transaction, type })
  }

  private async persistOrderDetailRow(params: {
    name: string
    quantity: number
    productId: number
    variantId: number
    warehouseId: number
    orderId: number
    note: string
    transaction: Transaction
    extraAttributes: Record<string, unknown>
  }): Promise<void> {
    const { quantity, productId, variantId, warehouseId, orderId, note, transaction, extraAttributes } = params
    const orderDetailBuilder = OrderDetail.build({
      quantity,
      warehouseId,
      orderId,
      note,
      productId,
      variantId,
      ...extraAttributes
    } as any)

    await orderDetailBuilder.save({ transaction })
  }

  private async propagateOrderDetailStockChanges(params: {
    quantity: number
    productId: number
    variantId: number
    warehouseId: number
    transaction: Transaction
    type: string
  }): Promise<void> {
    const { quantity, productId, variantId, warehouseId, transaction, type } = params
    await this.updateInventory({ quantity, productId, variantId, warehouseId, transaction, type })
    await this.updateProductQuantity({
      quantity,
      productId,
      variantId,
      transaction,
      type
    })
    await this.createTransfer({ quantity, warehouseId, productId, variantId, transaction, type })
  }

  /**
   * POS channel: create FULL invoice for the whole order inside the SAME
   * transaction (stock decrement + invoice + ledger commit atomically).
   * Non-POS channels skip auto-invoice; invoices are created on demand via
   * POST /orders/:id/invoices (partial allowed).
   */
  async attemptCreateInvoice({ order, transaction }: { order: Order; transaction: Transaction }) {
    try {
      if ((order as any).providerId != null) return null
      if ((order as any).channel !== 'POS') return null
      const orderDetailRows = await OrderDetail.findAll({ where: { orderId: (order as any).id }, transaction })
      if (!orderDetailRows.length) return null
      const invoiceLines = orderDetailRows.map((detailRow: any) => ({
        order_detail_id: Number(detailRow.get('id')),
        quantity: Number(detailRow.get('quantity'))
      }))
      return await new InvoiceService().createFromOrderLines(
        Number((order as any).id),
        invoiceLines,
        {
          vendorId: (order as any).vendorId,
          warehouseId: (order as any).warehouseId,
          customerId: (order as any).customerId ?? undefined,
          paymentType: (order as any).paymentType
        },
        null,
        transaction
      )
    } catch (error) {
      // POS auto-invoice failure must rollback the whole order (same tx).
      throw error
    }
  }

  // ---------------------------------------------------------------------------
  // Inventory
  // ---------------------------------------------------------------------------

  async updateInventory({ productId, variantId, warehouseId, quantity, transaction, type }: IInventoryUpdateParams) {
    const stockMovement = this.resolveStockMovement(type)
    const stockWhereClause = this.buildStockWhereClause(productId, warehouseId, variantId)

    let insufficientStockProductLabel: string | null = null
    let allowsOversell = false

    if (stockMovement === 'decrement') {
      const oversellPolicy = await this.resolveOversellPermission(productId, variantId, transaction)
      allowsOversell = oversellPolicy.allowsOversell
      if (!allowsOversell) {
        // The availability check is part of the atomic write below
        // (`quantity >= requested` in the decrement WHERE clause), so two
        // concurrent sales cannot both pass a stale read and oversell.
        await this.assertInventoryRowExistsForSale(stockWhereClause, variantId, transaction)
        insufficientStockProductLabel = oversellPolicy.productLabel
      }
    }

    const affectedRowCount = await this.applyAtomicStockMovement({
      stockMovement,
      stockWhereClause,
      quantity,
      allowsOversell,
      transaction
    })

    this.assertStockMovementApplied(affectedRowCount, insufficientStockProductLabel, variantId)
  }

  private resolveStockMovement(orderType?: string): 'increment' | 'decrement' {
    // type '0' = IN (import) -> increment inventory, otherwise decrement (export/sale)
    return orderType === ORDER_TYPE_IMPORT ? 'increment' : 'decrement'
  }

  private buildStockWhereClause(productId: number, warehouseId: number, variantId: number): Record<string, unknown> {
    if (variantId == null) throw new Error('variantId is required')
    return {
      productId,
      warehouseId,
      variantId
    }
  }

  private async resolveOversellPermission(
    productId: number,
    variantId: number,
    transaction: Transaction
  ): Promise<{ allowsOversell: boolean; productLabel: string }> {
    const productRow = await this.fetchProductForStockGuard(productId, transaction)
    const variantRow = await this.fetchVariantForStockGuard(variantId, transaction)
    const productLabel = `${productRow.name} [${variantRow.get('skuCode')}]`
    return { allowsOversell: Boolean(variantRow.get('isNegative')), productLabel }
  }

  private async fetchProductForStockGuard(productId: number, transaction: Transaction): Promise<any> {
    const productRow = await Product.findByPk(productId, { transaction } as any)
    if (!productRow) {
      const softDeletedProduct = await Product.findByPk(productId, { paranoid: false, transaction } as any)
      if (softDeletedProduct) throw ApiError.from(`Product ${productId} is deleted/discontinued and cannot be sold`)
      throw ApiError.from(`Product ${productId} not found`)
    }
    return productRow
  }

  private async fetchVariantForStockGuard(variantId: number, transaction: Transaction): Promise<any> {
    const variantRow = await ProductVariant.findByPk(variantId, { transaction } as any)
    if (!variantRow) {
      const softDeletedVariant = await ProductVariant.findByPk(variantId, {
        paranoid: false,
        transaction
      } as any)
      if (softDeletedVariant) throw ApiError.from(`Variant ${variantId} is deleted/discontinued and cannot be sold`)
      throw ApiError.from(`Variant ${variantId} not found`)
    }
    return variantRow
  }

  private async assertInventoryRowExistsForSale(
    stockWhereClause: Record<string, unknown>,
    variantId: number,
    transaction: Transaction
  ): Promise<void> {
    const inventoryRow = await Inventory.findOne({ where: stockWhereClause, transaction } as any)
    if (!inventoryRow) {
      throw ApiError.from(`Inventory not found for variant ${variantId}`)
    }
  }

  private async applyAtomicStockMovement(params: {
    stockMovement: 'increment' | 'decrement'
    stockWhereClause: Record<string, unknown>
    quantity: number
    allowsOversell: boolean
    transaction: Transaction
  }): Promise<number> {
    const { stockMovement, stockWhereClause, quantity, allowsOversell, transaction } = params
    const rawResult: any = await Inventory[stockMovement]('quantity', {
      by: quantity,
      where:
        stockMovement === 'decrement' && !allowsOversell
          ? { ...stockWhereClause, quantity: { [Op.gte]: Number(quantity) } }
          : stockWhereClause,
      transaction
    })
    return this.parseAffectedRowCount(rawResult)
  }

  private parseAffectedRowCount(rawResult: any): number {
    // Sequelize MySQL returns different shapes: [affectedCount] (mock) vs [undefined, affectedCount] vs [[undefined, affectedCount]]
    if (Array.isArray(rawResult)) {
      if (Array.isArray(rawResult[0])) {
        // e.g. [[undefined, 0]] from real MySQL increment/decrement
        return (rawResult[0] as any)[1] ?? (rawResult[0] as any)[0]
      }
      if (typeof rawResult[1] === 'number') {
        // [undefined, count]
        return rawResult[1]
      }
      if (typeof rawResult[0] === 'number') {
        // [count] from mocks
        return rawResult[0]
      }
      return rawResult[0] as number
    }
    return rawResult as number
  }

  private assertStockMovementApplied(
    affectedRowCount: number,
    insufficientStockProductLabel: string | null,
    variantId: number
  ): void {
    if (affectedRowCount !== 0) return
    // Distinguish "row missing" from "insufficient stock" for the client.
    if (insufficientStockProductLabel) {
      throw ApiError.from(`Insufficient stock for product "${insufficientStockProductLabel}"`)
    }
    throw ApiError.from(`Inventory not found for variant ${variantId}`)
  }

  /**
   * @description Update product sold quantity
   * @param {Object} params - contains update product quantity information
   * @param {number} params.productId - product ID
   * @param {number} params.quantity - quantity to add to product sold
   * @param {Transaction} params.transaction - transaction object
   * @returns {Promise<void>} - a Promise that resolves when product is updated
   */
  async updateProductQuantity({ quantity, productId, variantId, transaction, type }: IProductUpdateParams) {
    try {
      // sold should only track SALES. Imports (type '0' = IN) must NOT affect sold.
      if (type === ORDER_TYPE_IMPORT) return
      await this.applySoldCounterChange({
        productId,
        variantId,
        quantity,
        operator: 'increment',
        transaction,
        notFoundMessage: 'Product not found',
        variantNotFoundMessage: 'Variant not found'
      })
    } catch (error) {
      throw ApiError.from(error, 400)
    }
  }

  /**
   * Adjust sold counter by delta (positive = more sold, negative = returned).
   * No-op for imports (type '0').
   */
  private async adjustSoldByDelta(params: IProductUpdateParams & { delta: number }) {
    const { delta, type, productId, variantId, transaction } = params
    if (delta === 0) return
    if (type === ORDER_TYPE_IMPORT) return // imports don't affect sold
    const absoluteQuantity = Math.abs(delta)
    const operator = delta > 0 ? 'increment' : 'decrement'
    await this.applySoldCounterChange({
      productId,
      variantId,
      quantity: absoluteQuantity,
      operator,
      transaction,
      notFoundMessage: 'Product not found for sold adjustment',
      variantNotFoundMessage: 'Variant not found for sold adjustment'
    })
  }

  private async applySoldCounterChange(params: {
    productId: number
    variantId: number
    quantity: number
    operator: 'increment' | 'decrement'
    transaction: Transaction
    notFoundMessage: string
    variantNotFoundMessage: string
  }): Promise<void> {
    const { productId, variantId, quantity, operator, transaction, variantNotFoundMessage } = params
    // Product has no stored sold column anymore; the variant counter is the
    // single source of truth and product-level sold is a read aggregate.
    const variantResult = await ProductVariant[operator]('sold', {
      by: quantity,
      where: { id: variantId, productId },
      transaction
    })
    if (!this.hasAffectedSoldRows(variantResult)) throw new Error(variantNotFoundMessage)
    await evictCachedEntity('product', productId)
  }

  private hasAffectedSoldRows(rawResult: any): boolean {
    // Handle both mock ([{sold}]) and real MySQL ([undefined, count] or [[undefined, count]])
    if (!Array.isArray(rawResult)) return Boolean(rawResult)
    if (Array.isArray(rawResult[0])) {
      return (rawResult[0][1] as number) > 0 || Boolean(rawResult[0][0])
    }
    if (typeof rawResult[1] === 'number') return rawResult[1] > 0
    return Boolean(rawResult[0])
  }

  /**
   * @description Create a new transfer
   * @param {Object} params - contains creation information
   * @param {Transaction} params.transaction - transaction object
   * @param {number} params.warehouseId - warehouse ID
   * @param {number} params.quantity - quantity to transfer
   * @param {number} params.productId - product ID
   * @param {string} params.type - transfer type, "0" for export, "1" for import
   * @returns {Promise<void>} - a Promise that resolves when transfer is created
   */
  async createTransfer({ transaction, warehouseId, fromWarehouseId, toWarehouseId, ...params }: ICreateTransferParams) {
    try {
      const resolvedFromWarehouseId = fromWarehouseId ?? warehouseId ?? null
      const resolvedToWarehouseId = toWarehouseId ?? null
      const transferResponse = await new TransferService().create(
        {
          ...params,
          fromWarehouseId: resolvedFromWarehouseId as any,
          toWarehouseId: resolvedToWarehouseId as any
        } as any,
        { transaction }
      )
      return transferResponse
    } catch (error) {
      throw ApiError.from(error, 400)
    }
  }

  /**
   * @description Auto-create a financial voucher when an order is created.
   * Sales (no providerId) -> revenue voucher. Provider imports -> expense (import cost) voucher.
   */
  async createFinancialVoucher({
    order,
    warehouseId,
    transaction,
    transactionDate
  }: {
    order: Order
    warehouseId: number
    transaction: Transaction
    transactionDate?: Date
  }) {
    try {
      const isImportOrder = (order as any).providerId != null
      const voucherPrefix = isImportOrder ? 'PC' : 'PT'
      const voucherBaseDate = transactionDate ?? (order as any).createdAt ?? new Date()
      const voucherDatePart = new Date(voucherBaseDate).toISOString().slice(0, 10).replace(/-/g, '')
      const voucherCode = `${voucherPrefix}-${voucherDatePart}-${(order as any).id}`
      await FinancialRecord.create(
        {
          code: voucherCode,
          type: isImportOrder ? 'expense' : 'revenue',
          category: isImportOrder ? 'import' : 'sale',
          amount: Number((order as any).paid),
          relatedType: isImportOrder ? 'importOrder' : 'order',
          relatedId: (order as any).id,
          warehouseId,
          transactionDate: transactionDate ?? (order as any).createdAt ?? new Date()
        } as any,
        { transaction }
      )
    } catch (error) {
      console.log('createFinancialVoucher error', error)
      throw ApiError.from(error, 400)
    }
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  /**
   * Update an existing order and adjust inventory by the difference between
   * old and new quantities, so stock always reflects reality.
   * Note: the original transfer/financial voucher records are kept as-is
   * (they document the state at creation time).
   */
  async update(req: IRequestLocal) {
    const transaction = await this.sequelize.transaction()
    try {
      const vendorScope = getVendorScope(req)
      const { id: orderIdParam } = req.params
      const {
        VAT: vatInput,
        surcharge: surchargeInput,
        paymentType,
        orderDetails: updatedOrderLines,
        type: requestedType = ORDER_TYPE_SALE
      } = req.body

      if (!updatedOrderLines || updatedOrderLines.length === 0) {
        throw new Error('Order details are required')
      }

      const existingOrder = await this.loadOrderForUpdate(orderIdParam, vendorScope, transaction)
      const warehouseId = Number((existingOrder as any).warehouseId)
      const effectiveOrderType = (existingOrder as any).providerId != null ? ORDER_TYPE_IMPORT : requestedType

      const quantityDeltas = await this.computeOrderQuantityDeltas(existingOrder, updatedOrderLines, transaction)
      await this.applyQuantityDeltas({ quantityDeltas, warehouseId, effectiveOrderType, transaction })
      await this.replaceOrderDetailRows({
        orderId: Number((existingOrder as any).id),
        warehouseId,
        updatedOrderLines,
        transaction
      })

      const recalculatedTotals = this.calculateOrderTotals(updatedOrderLines, surchargeInput, vatInput)
      await this.applyRecalculatedTotalsToOrder({
        order: existingOrder,
        recalculatedTotals,
        vatInput,
        surchargeInput,
        paymentType,
        transaction
      })
      await this.syncFinancialRecordAmount(existingOrder, recalculatedTotals.totalPayable, transaction)

      await transaction.commit()

      return this.getOrderById(
        {
          id: String((existingOrder as any).id),
          warehouseId: String(warehouseId)
        },
        vendorScope
      )
    } catch (error) {
      console.log('order update error', error)
      await transaction.rollback()
      throw ApiError.from(error, 400)
    }
  }

  private async loadOrderForUpdate(orderIdParam: string | number, vendorScope: TVendorScope, transaction: Transaction) {
    const existingOrder = await Order.findByPk(orderIdParam as any, { transaction } as any)
    if (!existingOrder) {
      throw new Error('Order not found')
    }
    // Scoped callers may only update orders in warehouses they own.
    await assertWarehouseAccess((existingOrder as any).warehouseId, vendorScope)
    assertVendorAccess(vendorScope, (existingOrder as any).vendorId, 'Unauthorized to update this order')
    return existingOrder
  }

  private buildLineQuantityKey(line: { productId: number; variantId?: number | null }): string {
    if (line.variantId == null) throw new Error('variantId is required')
    return `${line.productId}-${line.variantId}`
  }

  private async computeOrderQuantityDeltas(
    existingOrder: any,
    updatedOrderLines: any[],
    transaction: Transaction
  ): Promise<Array<OrderLineQuantity & { delta: number }>> {
    const previousDetailRows = await OrderDetail.findAll({
      where: { orderId: existingOrder.id },
      transaction
    })

    const previousQuantityByKey = new Map<string, OrderLineQuantity>()
    for (const detailRow of previousDetailRows) {
      const detailValues = detailRow.get() as any
      previousQuantityByKey.set(this.buildLineQuantityKey(detailValues), {
        productId: Number(detailRow.get('productId')),
        variantId: Number(detailRow.get('variantId')),
        quantity: Number(detailRow.get('quantity'))
      })
    }

    const updatedQuantityByKey = new Map<string, OrderLineQuantity>()
    for (const orderLine of updatedOrderLines) {
      updatedQuantityByKey.set(this.buildLineQuantityKey(orderLine), {
        productId: Number(orderLine.productId),
        variantId: Number(orderLine.variantId),
        quantity: Number(orderLine.quantity)
      })
    }

    const quantityDeltas: Array<OrderLineQuantity & { delta: number }> = []
    const allLineKeys = new Set([...previousQuantityByKey.keys(), ...updatedQuantityByKey.keys()])
    for (const lineKey of allLineKeys) {
      const previousQuantity = previousQuantityByKey.get(lineKey)?.quantity ?? 0
      const updatedQuantity = updatedQuantityByKey.get(lineKey)?.quantity ?? 0
      const quantityDelta = updatedQuantity - previousQuantity
      if (quantityDelta === 0) continue
      const referenceLine = updatedQuantityByKey.get(lineKey) ?? previousQuantityByKey.get(lineKey)!
      quantityDeltas.push({ ...referenceLine, delta: quantityDelta })
    }
    return quantityDeltas
  }

  private resolveInventoryAdjustmentType(effectiveOrderType: string, quantityDelta: number): string {
    // For sales: increase => export more, decrease => return stock.
    // For imports: the opposite.
    if (effectiveOrderType === ORDER_TYPE_IMPORT) {
      return quantityDelta > 0 ? ORDER_TYPE_IMPORT : ORDER_TYPE_SALE
    }
    return quantityDelta > 0 ? ORDER_TYPE_SALE : ORDER_TYPE_IMPORT
  }

  private async applyQuantityDeltas(params: {
    quantityDeltas: Array<OrderLineQuantity & { delta: number }>
    warehouseId: number
    effectiveOrderType: string
    transaction: Transaction
  }): Promise<void> {
    const { quantityDeltas, warehouseId, effectiveOrderType, transaction } = params
    for (const quantityDelta of quantityDeltas) {
      const absoluteDelta = Math.abs(quantityDelta.delta)
      const inventoryAdjustmentType = this.resolveInventoryAdjustmentType(effectiveOrderType, quantityDelta.delta)

      await this.updateInventory({
        productId: quantityDelta.productId,
        variantId: quantityDelta.variantId,
        warehouseId,
        quantity: absoluteDelta,
        transaction,
        type: inventoryAdjustmentType
      })
      // Keep history (transfers) in sync with inventory movements.
      await this.createTransfer({
        productId: quantityDelta.productId,
        variantId: quantityDelta.variantId,
        warehouseId,
        quantity: absoluteDelta,
        transaction,
        type: inventoryAdjustmentType
      })
      // Keep sold in sync for SALES only (imports don't affect sold).
      if (effectiveOrderType !== ORDER_TYPE_IMPORT) {
        await this.adjustSoldByDelta({
          productId: quantityDelta.productId,
          variantId: quantityDelta.variantId,
          quantity: absoluteDelta,
          delta: quantityDelta.delta,
          type: effectiveOrderType,
          transaction
        })
      }
    }
  }

  private async replaceOrderDetailRows(params: {
    orderId: number
    warehouseId: number
    updatedOrderLines: any[]
    transaction: Transaction
  }): Promise<void> {
    const { orderId, warehouseId, updatedOrderLines, transaction } = params
    await OrderDetail.destroy({ where: { orderId }, transaction })
    for (const orderLine of updatedOrderLines) {
      await OrderDetail.create(
        {
          orderId,
          warehouseId,
          productId: orderLine.productId,
          variantId: Number(orderLine.variantId),
          quantity: orderLine.quantity,
          price: orderLine.price,
          buyPrice: orderLine.buyPrice,
          note: orderLine.note
        },
        { transaction }
      )
    }
  }

  private async applyRecalculatedTotalsToOrder(params: {
    order: any
    recalculatedTotals: OrderTotals
    vatInput: number | string
    surchargeInput: number | string
    paymentType?: string
    transaction: Transaction
  }): Promise<void> {
    const { order, recalculatedTotals, vatInput, surchargeInput, paymentType, transaction } = params
    order.price = recalculatedTotals.totalPrice
    order.VAT = Number(vatInput)
    order.surcharge = Number(surchargeInput)
    order.paid = recalculatedTotals.totalPayable
    if (paymentType) {
      order.paymentType = paymentType
    }
    await order.save({ transaction })
  }

  private async syncFinancialRecordAmount(order: any, totalPayable: number, transaction: Transaction): Promise<void> {
    // Keep financial_records in sync so reports do not drift after edit.
    await FinancialRecord.update({ amount: totalPayable } as any, {
      where: { relatedId: order.id, relatedType: order.providerId != null ? 'importOrder' : 'order' },
      transaction
    })
  }

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  /**
   * Return part or all of a sale order: creates a return document, flows the
   * goods back into warehouse stock (IN transfers), decrements `sold`, and
   * books a refund expense voucher. The order status becomes
   * 'partially_returned' or 'returned' depending on coverage.
   * body: { items: [{ orderDetailId | productId, variantId?, quantity }], reason?, refundAmount? }
   */
  async returnOrder(req: IRequestLocal) {
    const transaction = await this.sequelize.transaction()
    try {
      const vendorScope = getVendorScope(req)
      const { orderId, returnLineRequests, refundOverride, returnReason } = this.parseReturnOrderRequest(req)

      const saleOrder: any = await this.loadReturnableSaleOrder(orderId, vendorScope, transaction)
      const warehouseId = Number(saleOrder.warehouseId)

      const orderDetailsById = await this.indexOrderDetailsById(orderId, transaction)
      const alreadyReturnedByLineId = await this.accumulateReturnedQuantities(orderId, transaction)

      const { returnLineSnapshot, refundTotal } = await this.processReturnLines({
        returnLineRequests,
        orderDetailsById,
        alreadyReturnedByLineId,
        warehouseId,
        transaction
      })

      const finalRefundAmount = this.resolveRefundAmount(refundOverride, refundTotal)
      const returnDocument: any = await this.createReturnDocument({
        orderId,
        warehouseId,
        saleOrder,
        returnLineSnapshot,
        finalRefundAmount,
        returnReason,
        transaction
      })
      await this.createRefundExpenseVoucherIfNeeded({
        saleOrder,
        returnDocument,
        warehouseId,
        finalRefundAmount,
        transaction
      })

      const finalStatus = this.resolveReturnStatus({
        orderDetailRows: [...orderDetailsById.values()],
        alreadyReturnedByLineId,
        returnLineSnapshot
      })
      await saleOrder.update({ status: finalStatus }, { transaction })

      await transaction.commit()
      return { return: returnDocument, refundAmount: finalRefundAmount, status: finalStatus }
    } catch (error) {
      await transaction.rollback()
      throw ApiError.from(error, 400)
    }
  }

  private parseReturnOrderRequest(req: IRequestLocal): {
    orderId: number
    returnLineRequests: any[]
    refundOverride?: number
    returnReason?: string | null
  } {
    const orderId = Number((req.params as any).id)
    if (!orderId) throw new Error('order id is required')
    const requestBody: any = (req as any).body || {}
    const returnLineRequests: any[] = Array.isArray(requestBody.items) ? requestBody.items : []
    if (!returnLineRequests.length) throw new Error('items are required')

    return {
      orderId,
      returnLineRequests,
      refundOverride: requestBody.refundAmount != null ? Number(requestBody.refundAmount) : undefined,
      returnReason: requestBody.reason ? String(requestBody.reason) : null
    }
  }

  private async loadReturnableSaleOrder(orderId: number, vendorScope: TVendorScope, transaction: Transaction) {
    const saleOrder: any = await Order.findByPk(orderId, { transaction } as any)
    if (!saleOrder) throw new Error('Order not found')
    // Import (provider) orders flow the opposite direction - returns are for sales only.
    if (saleOrder.providerId != null) throw new Error('Import orders cannot be returned. Use a new export instead.')
    await assertWarehouseAccess(saleOrder.warehouseId, vendorScope)
    assertVendorAccess(vendorScope, saleOrder.vendorId, 'Unauthorized to return this order')
    if (saleOrder.status === 'returned') throw new Error('Order has already been fully returned')
    return saleOrder
  }

  private async indexOrderDetailsById(orderId: number, transaction: Transaction): Promise<Map<number, any>> {
    const orderDetailRows: any[] = await OrderDetail.findAll({ where: { orderId }, transaction } as any)
    const orderDetailsById = new Map<number, any>()
    for (const detailRow of orderDetailRows as any[]) {
      orderDetailsById.set(Number(detailRow.get('id')), detailRow)
    }
    return orderDetailsById
  }

  private async accumulateReturnedQuantities(orderId: number, transaction: Transaction): Promise<Map<number, number>> {
    const priorReturnDocs: any[] = await OrderReturn.findAll({ where: { orderId }, transaction } as any)
    const alreadyReturnedByLineId = new Map<number, number>()
    for (const priorReturn of priorReturnDocs as any[]) {
      let priorItems: any[] = []
      try {
        priorItems = JSON.parse(priorReturn.get('items') || '[]')
      } catch {
        priorItems = []
      }
      for (const priorItem of priorItems) {
        const lineId = Number(priorItem.orderDetailId)
        if (lineId) {
          alreadyReturnedByLineId.set(
            lineId,
            (alreadyReturnedByLineId.get(lineId) ?? 0) + Number(priorItem.quantity || 0)
          )
        }
      }
    }
    return alreadyReturnedByLineId
  }

  private async processReturnLines(params: {
    returnLineRequests: any[]
    orderDetailsById: Map<number, any>
    alreadyReturnedByLineId: Map<number, number>
    warehouseId: number
    transaction: Transaction
  }): Promise<{ returnLineSnapshot: any[]; refundTotal: number }> {
    const { returnLineRequests, orderDetailsById, alreadyReturnedByLineId, warehouseId, transaction } = params
    const returnLineSnapshot: any[] = []
    let refundTotal = 0

    for (const returnLineRequest of returnLineRequests) {
      const matchingDetail = this.validateReturnLine(returnLineRequest, orderDetailsById, alreadyReturnedByLineId)
      const returnQuantity = Number(returnLineRequest.quantity)
      const unitPrice = Number(matchingDetail.get('price') ?? 0)
      refundTotal += unitPrice * returnQuantity

      await this.restockReturnedLine({ matchingDetail, warehouseId, returnQuantity, transaction })

      returnLineSnapshot.push({
        orderDetailId: Number(matchingDetail.get('id')),
        productId: Number(matchingDetail.get('productId')),
        variantId: Number(matchingDetail.get('variantId')),
        name: (matchingDetail as any).name ?? '',
        quantity: returnQuantity,
        price: unitPrice
      })
    }

    return { returnLineSnapshot, refundTotal }
  }

  private validateReturnLine(
    returnLineRequest: any,
    orderDetailsById: Map<number, any>,
    alreadyReturnedByLineId: Map<number, number>
  ): any {
    const matchingDetail = orderDetailsById.get(Number(returnLineRequest.orderDetailId))
    if (!matchingDetail) throw new Error(`Order detail ${returnLineRequest.orderDetailId} not found on this order`)

    const returnQuantity = Number(returnLineRequest.quantity)
    if (!returnQuantity || returnQuantity <= 0) throw new Error('Return quantity must be positive')

    const alreadyReturnedQuantity = alreadyReturnedByLineId.get(Number(matchingDetail.get('id'))) ?? 0
    const purchasedQuantity = Number(matchingDetail.get('quantity'))
    const returnableQuantity = purchasedQuantity - alreadyReturnedQuantity
    if (returnQuantity > returnableQuantity) {
      throw new Error(
        `Cannot return ${returnQuantity} of detail ${matchingDetail.get('id')}: only ${returnableQuantity} remaining (bought ${purchasedQuantity}, returned ${alreadyReturnedQuantity})`
      )
    }
    return matchingDetail
  }

  private async restockReturnedLine(params: {
    matchingDetail: any
    warehouseId: number
    returnQuantity: number
    transaction: Transaction
  }): Promise<void> {
    const { matchingDetail, warehouseId, returnQuantity, transaction } = params
    const productId = Number(matchingDetail.get('productId'))
    const variantId = Number(matchingDetail.get('variantId'))
    if (!Number.isFinite(variantId)) throw new Error('variantId is required')

    // Goods flow back into stock (IN transfer, type '0').
    await this.updateInventory({
      productId,
      variantId,
      warehouseId,
      quantity: returnQuantity,
      transaction,
      type: ORDER_TYPE_IMPORT
    })
    await this.createTransfer({
      productId,
      variantId,
      warehouseId,
      quantity: returnQuantity,
      transaction,
      type: ORDER_TYPE_IMPORT
    })
    // Sold counter goes down (sales only).
    await this.adjustSoldByDelta({
      productId,
      variantId,
      quantity: returnQuantity,
      delta: -returnQuantity,
      type: ORDER_TYPE_SALE,
      transaction
    })
  }

  private resolveRefundAmount(refundOverride: number | undefined, refundTotal: number): number {
    // Optional explicit refund override (e.g. restocking fee).
    return refundOverride != null ? refundOverride : refundTotal
  }

  private async createReturnDocument(params: {
    orderId: number
    warehouseId: number
    saleOrder: any
    returnLineSnapshot: any[]
    finalRefundAmount: number
    returnReason: string | null | undefined
    transaction: Transaction
  }) {
    const { orderId, warehouseId, saleOrder, returnLineSnapshot, finalRefundAmount, returnReason, transaction } = params
    const returnDatePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const returnCode = `RET-${returnDatePart}-${orderId}`
    return OrderReturn.create(
      {
        code: returnCode,
        orderId,
        warehouseId,
        vendorId: saleOrder.vendorId ?? null,
        staffId: saleOrder.staffId ?? null,
        items: JSON.stringify(returnLineSnapshot),
        refundAmount: finalRefundAmount,
        reason: returnReason ? String(returnReason) : null
      } as any,
      { transaction }
    )
  }

  private async createRefundExpenseVoucherIfNeeded(params: {
    saleOrder: any
    returnDocument: any
    warehouseId: number
    finalRefundAmount: number
    transaction: Transaction
  }): Promise<void> {
    const { saleOrder, returnDocument, warehouseId, finalRefundAmount, transaction } = params
    if (finalRefundAmount <= 0) return
    await FinancialRecord.create(
      {
        code: `PC-RET-${returnDocument.get('id')}`,
        type: 'expense',
        category: 'return',
        amount: finalRefundAmount,
        relatedType: 'orderReturn',
        relatedId: returnDocument.get('id'),
        warehouseId,
        note: `Hoàn tiền cho đơn ${saleOrder.code ?? saleOrder.id}`
      } as any,
      { transaction }
    )
  }

  private resolveReturnStatus(params: {
    orderDetailRows: any[]
    alreadyReturnedByLineId: Map<number, number>
    returnLineSnapshot: any[]
  }): 'returned' | 'partially_returned' {
    const { orderDetailRows, alreadyReturnedByLineId, returnLineSnapshot } = params
    const totalReturnedByLineId = new Map<number, number>()
    for (const [lineId, returnedQuantity] of alreadyReturnedByLineId) {
      totalReturnedByLineId.set(lineId, returnedQuantity)
    }
    for (const snapshotItem of returnLineSnapshot) {
      totalReturnedByLineId.set(
        snapshotItem.orderDetailId,
        (totalReturnedByLineId.get(snapshotItem.orderDetailId) ?? 0) + snapshotItem.quantity
      )
    }
    const isFullyReturned = orderDetailRows.every((detailRow) => {
      const totalReturned = totalReturnedByLineId.get(Number(detailRow.get('id'))) ?? 0
      return totalReturned >= Number(detailRow.get('quantity'))
    })
    return isFullyReturned ? 'returned' : 'partially_returned'
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /**
   * @function getOrders
   * @description Get orders with pagination
   * @param {Object} params - pagination params, warehouseId, isProvider
   * @return {Promise<Object>} - result of query
   */
  async getOrders({ isProvider, warehouseId, vendorId, page, pageSize }: IOrderQueryParams, vendorScope: TVendorScope) {
    try {
      const { offset, limit } = getPagination({ page, pageSize })
      // warehouseId comes from the query string - verify it belongs to one
      // of the caller's vendors before using it as a filter.
      if (!warehouseId) throw new Error('warehouseId is required')
      await assertWarehouseAccess(warehouseId as string, vendorScope)

      const whereClause = this.buildOrderListWhere({ isProvider, vendorId, vendorScope, warehouseId })

      const queryParams = {
        where: whereClause,
        include: [
          {
            model: database.orderDetail
          }
        ],
        offset: Number(offset),
        limit: Number(limit),
        order: [['id', 'DESC']],
        distinct: true, // Prevents wrong count / join fan-out with hasMany include
        separate: false
      }
      const resp = await Order.findAndCountAll(queryParams as any)
      return resp
    } catch (error) {
      console.warn('error', error)
      throw ApiError.from(error, 400)
    }
  }

  private buildOrderListWhere(params: {
    warehouseId: unknown
    isProvider: unknown
    vendorId: unknown
    vendorScope: TVendorScope
  }): Record<string, unknown> {
    const { warehouseId, isProvider, vendorId, vendorScope } = params
    const whereClause: any = {
      warehouseId: warehouseId as string,
      providerId: isProvider ? { [Op.ne]: null } : { [Op.eq]: null }
    }

    // Vendor filter must be within the caller's vendor scope; scoped users
    // without an explicit filter only ever see their own vendors.
    if (vendorId) {
      assertVendorAccess(vendorScope, Number(vendorId), "Unauthorized to read this vendor's orders")
      whereClause.vendorId = Number(vendorId)
    } else if (vendorScope !== null) {
      whereClause.vendorId = { [Op.in]: vendorScope }
    }
    return whereClause
  }

  /**
   * Retrieves an order by its ID and vendor ID.
   *
   * @param {Object} params - The parameters containing the order ID.
   * @param {string} params.id - The unique identifier of the order.
   * @param {Object} query - The query parameters containing the vendor ID.
   * @param {string} query.vendor - The unique identifier of the vendor.
   *
   * @returns {Promise<Object|null>} The order details including inventory quantity if found, otherwise null.
   *
   * @throws Will throw an error if retrieving the order fails.
   */

  async getOrderById(
    { id, warehouseId }: { id: string; warehouseId: string },
    /** Multi-tenant scope from auth middleware (null = platform admin). */
    vendorScope: TVendorScope = null
  ) {
    try {
      // The caller may only read orders inside warehouses they own.
      await assertWarehouseAccess(warehouseId, vendorScope)

      const orderWithDetails: any = await this.fetchOrderWithDetails(id, warehouseId)
      if (orderWithDetails) {
        await this.enrichWithInvoiceProgress(orderWithDetails, Number(id))
      }
      return orderWithDetails
    } catch (error) {
      throw ApiError.from(error, 400)
    }
  }

  private async fetchOrderWithDetails(orderId: string, warehouseId: string) {
    return Order.findOne({
      where: {
        id: orderId,
        warehouseId: warehouseId
      },
      include: [
        {
          model: OrderDetail,
          include: [
            {
              model: Product,
              attributes: [],
              paranoid: false
            },
            {
              model: ProductVariant,
              attributes: ['id', 'skuCode'],
              paranoid: false,
              include: [
                {
                  model: ProductAttributeValue,
                  attributes: ['id', 'value', 'attributeId'],
                  through: { attributes: [] },
                  include: [{ model: ProductAttribute, attributes: ['id', 'name'] }]
                }
              ]
            }
          ]
        }
      ] as IncludeOptions,
      attributes: {
        include: [[this.sequelize.col('orderDetails.product.name'), 'orderDetails.name']]
      }
    })
  }

  private async enrichWithInvoiceProgress(orderWithDetails: any, orderId: number): Promise<void> {
    // Compute realtime invoice progress per order line (compute, never stored).
    const invoicedQuantityByLineId = await new InvoiceService().getInvoicedMap(orderId)
    const orderDetailRows: any[] = orderWithDetails.orderDetails ?? []
    for (const detailRow of orderDetailRows) {
      const orderedQuantity = Number(detailRow.get('quantity') ?? 0)
      const invoicedQuantity = invoicedQuantityByLineId.get(Number(detailRow.get('id'))) ?? 0
      detailRow.setDataValue('invoicedQty' as any, invoicedQuantity)
      detailRow.setDataValue('remainingQty' as any, Math.max(orderedQuantity - invoicedQuantity, 0))
    }
  }

  async getOrderCode(id: string, vendorId: string) {
    try {
      const vendorSettings = vendorId ? await new SettingService().getForVendor(Number(vendorId)) : null
      const { prefix, suffix } = getCodeFormat(vendorSettings?.codePrefix, vendorSettings?.codeSuffix, 'order')
      return applyCodeFormat(`ORD${new Date().getFullYear()}${String(id).padStart(5, '0')}`, prefix, suffix)
    } catch (codeError) {
      console.warn('order code generation failed', codeError)
      return undefined
    }
  }
}
