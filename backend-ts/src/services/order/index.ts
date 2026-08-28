import database from '#/database'
import { IRequestLocal } from '#/types/common'
import { IInventoryStatic } from '#/types/inventory'
import { IOrderModel, IOrderStatic } from '#/types/order'
import { IOrderDetailStatic } from '#/types/orderDetail'
import { IFinancialRecordStatic } from '#/types/financialRecord'
import { IProductStatic } from '#/types/product'
import { assertVendorAccess, assertWarehouseAccess, getVendorScope, TVendorScope } from '#/utils/tenant'
import { IncludeOptions, Op, Optional, Transaction } from 'sequelize'
import { TransferService } from '../transfer'
import { SettingService } from '../setting'
import { applyCodeFormat, getCodeFormat } from '#/utils/code-generator'
import { Request } from 'express'
import Inventory from '#/database/models/inventory'
import ProductVariant from '#/database/models/productVariant'
import Order from '#/database/models/order'
import OrderDetail from '#/database/models/orderDetail'
import Product from '#/database/models/product'
import FinancialRecord from '#/database/models/financialRecord'
interface IOrderCreateParams {
  price?: number | string
  VAT?: number | string
  surcharge?: number | string
  type?: string
  orderDetails: any[]
  paid: number | string
  paymentType: 'cash' | 'transfer' | 'credit'
  warehouseId: number | string
  providerId: number | string
  vendorId?: number | string
}
interface IOrderDetailCreateParams {
  name: string
  quantity: number
  productId: number
  variantId?: number | null
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
  variantId?: number | null
  warehouseId: number
  quantity: number
  transaction: Transaction
  type?: string
}

interface IProductUpdateParams {
  quantity: number
  productId: number
  variantId?: number | null
  transaction: Transaction
}
interface ICreateTransferParams {
  transaction: Transaction
  warehouseId?: number
  fromWarehouseId?: number
  toWarehouseId?: number
  quantity: number
  productId: number
  variantId?: number | null
  type?: string
}
export default class OrderService {
  sequelize = database.sequelize

  async create(
    { VAT, surcharge, paymentType, warehouseId, providerId, orderDetails, type = '1', vendorId }: IOrderCreateParams,
    /** Multi-tenant scope from auth middleware (null = platform admin). */
    vendorScope: TVendorScope = null
  ) {
    // Imports (providerId set) are inbound stock (type '0'), sales are outbound ('1')
    if (providerId != null) type = '0';
    // Tenant check: the warehouse must belong to one of the caller's vendors
    // and any explicitly requested vendorId must be within scope.
    const warehouseVendorId = await assertWarehouseAccess(warehouseId, vendorScope)
    if (vendorId != null) {
      assertVendorAccess(vendorScope, Number(vendorId), 'Unauthorized to create orders for this vendor')
    }
    const effectiveVendorId =
      vendorId != null
        ? Number(vendorId)
        : (warehouseVendorId ?? (vendorScope && vendorScope.length ? vendorScope[0] : null))

    const totalPrice = orderDetails.reduce((total, item) => (total += Number(item.buyPrice)), 0) + Number(surcharge)
    const totalPaid = Number(totalPrice + (totalPrice / 100) * Number(VAT))

    const orderParams: Partial<Omit<IOrderModel, 'id'>> = {
      VAT: Number(VAT),
      surcharge: Number(surcharge),
      paid: totalPaid,
      price: totalPrice,
      paymentType,
      warehouseId: Number(warehouseId),
      vendorId: effectiveVendorId
    }

    if (providerId) {
      orderParams.providerId = Number(providerId)
    }

    const t = await this.sequelize.transaction()
    try {
      // Calculate the total price of the order details and add the surcharge

      const orderBuilder = Order.build(orderParams as Optional<IOrderModel, 'id'>)

      const p = await orderBuilder.save({ transaction: t })

      // Generate the order code from the vendor's prefix/suffix settings
      let code = await this.getOrderCode(String(p.id), String(effectiveVendorId ?? ''))

      if (code) p.code = code

      await p.save({ transaction: t })

      const detailPromises = orderDetails.map((item) =>
        this.createOrderDetails({ transaction: t, warehouseId, orderId: p.id, type, ...item })
      )

      await Promise.all(detailPromises)

      // // // Create order details for each item
      // for (let item of orderDetails) {
      //   await this.createOrderDetails({ transaction: t, warehouseId, orderId: p.id, type, ...item })
      // }

      // Auto-create a financial voucher so the books stay in sync
      // (revenue for sales, expense/import-cost for provider imports)
      await this.createFinancialVoucher({
        order: p,
        warehouseId: Number(warehouseId),
        transaction: t
      })

      // Commit the transaction
      await t.commit()
      return p
    } catch (error) {
      // Log the error and rollback the transaction
      console.log('error', error)
      await t.rollback()
      throw error
    }
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
    try {
      const orderDetailBuilder = OrderDetail.build({
        quantity,
        warehouseId,
        orderId,
        note,
        productId,
        variantId: variantId ?? null,
        ...orderDetail
      })

      await orderDetailBuilder.save({ transaction })
      await this.updateInventory({ quantity, productId, variantId: variantId ?? null, warehouseId, transaction, type })
      await this.updateProductQuantity({ quantity, productId, transaction })
      await this.createTransfer({ quantity, warehouseId, productId, variantId, transaction, type })

      // return Promise.all([
      //   orderDetailBuilder.save({ transaction }),
      //   // Update the inventory
      //   this.updateInventory({ quantity, productId, variantId, warehouseId, transaction, type }),
      //   // Update the product quantity
      //   this.updateProductQuantity({ quantity, productId, variantId, transaction }),
      //   // Create a new transfer
      //   this.createTransfer({ quantity, warehouseId, productId, variantId, transaction, type })
      // ])
    } catch (error) {
      // Log the error and throw it
      console.log('error', error)
      throw error
    }
  }

  async updateInventory({ productId, variantId, warehouseId, quantity, transaction, type }: IInventoryUpdateParams) {
    // type '0' = IN (import) -> increment inventory, otherwise decrement (export/sale)
    const operator = type === '0' ? 'increment' : 'decrement'
    // Variant-aware stock row: a variant has its own (product, warehouse, variant)
    // inventory row; simple products use the legacy row where variantId IS NULL.
    const stockWhere: Record<string, unknown> = {
      productId,
      warehouseId,
      ...(variantId != null ? { variantId } : { variantId: null })
    }

    // Stock guard: on export/sale, block going below zero unless the product
    // is flagged to allow negative stock (products.isNegative). A variant's
    // own isNegative flag overrides the parent product setting.
    let allowNegative = false
    let insufficientStockLabel: string | null = null
    if (operator === 'decrement') {
      const product = await Product.findByPk(productId, { transaction })
      if (!product) {
        throw new Error(`Product ${productId} not found`)
      }
      let label = (product as any).name
      allowNegative = Boolean((product as any).isNegative)
      let variant: any = null
      if (!allowNegative && variantId != null) {
        variant = await ProductVariant.findByPk(variantId, { transaction })
        if (!variant) {
          throw new Error(`Variant ${variantId} not found`)
        }
        label = `${label} [${variant.get('skuCode')}]`
        allowNegative = Boolean(variant.get('isNegative'))
      } else if (variantId != null) {
        // Variant only needed for the error label; keep the existing message shape
        variant = await ProductVariant.findByPk(variantId, { transaction })
        if (variant) label = `${label} [${variant.get('skuCode')}]`
      }
      if (!allowNegative) {
        // C2 (TOCTOU): the availability check is part of the atomic write
        // below (`quantity >= requested` in the decrement WHERE clause), so
        // two concurrent sales cannot both pass a stale read and oversell.
        const inventoryRow = await Inventory.findOne({
          where: stockWhere,
          transaction
        })
        if (!inventoryRow) {
          throw new Error(variantId != null ? `Inventory not found for variant ${variantId}` : 'Inventory not found')
        }
        insufficientStockLabel = `${label}`
      }
    }

    const inventory: any = Inventory
    const [affectedRows] = await inventory[operator]('quantity', {
      by: quantity,
      where:
        operator === 'decrement' && !allowNegative
          ? { ...stockWhere, quantity: { [Op.gte]: Number(quantity) } }
          : stockWhere,
      transaction
    })

    if ((affectedRows as number) === 0) {
      // Distinguish "row missing" from "insufficient stock" for the client.
      if (insufficientStockLabel) {
        throw new Error(`Insufficient stock for product "${insufficientStockLabel}"`)
      }
      throw new Error(variantId != null ? `Inventory not found for variant ${variantId}` : 'Inventory not found')
    }
  }
  /**
   * @description Update product sold quantity
   * @param {Object} params - contains update product quantity information
   * @param {number} params.productId - product ID
   * @param {number} params.quantity - quantity to add to product sold
   * @param {Transaction} params.transaction - transaction object
   * @returns {Promise<void>} - a Promise that resolves when product is updated
   */
  async updateProductQuantity({ quantity, productId, variantId, transaction }: IProductUpdateParams) {
    try {
      // const prod = await Product.findByPk(productId)
      const [prod] = await Product.increment('sold', {
        by: quantity,
        where: { id: productId },
        transaction
      })
      if (!prod) throw new Error('Product not found')
      // prod.sold = prod.sold + quantity
      // await prod.save({ transaction })
      // Keep the per-variant sold counter in sync when a specific variant sold
      if (variantId != null) {
        // const variant = await ProductVariant.findByPk(variantId, { transaction })
        // if (variant) {
        //   variant.sold = Number(variant.get('sold') ?? 0) + quantity
        //   await variant.save({ transaction })
        // }
        const [variant] = await ProductVariant.increment('sold', {
          by: quantity,
          where: { id: variantId },
          transaction
        })
        if (!variant) throw new Error('Variant not found')
      }
    } catch (error) {
      throw error
    }
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
      const resolvedFrom = fromWarehouseId ?? warehouseId ?? null
      const resolvedTo = toWarehouseId ?? null
      const transferResponse = await new TransferService().create(
        { ...params, fromWarehouseId: resolvedFrom as any, toWarehouseId: resolvedTo as any } as any,
        { transaction }
      )
      return transferResponse
    } catch (error) {
      throw error
    }
  }

  /**
   * @description Auto-create a financial voucher when an order is created.
   * Sales (no providerId) -> revenue voucher. Provider imports -> expense (import cost) voucher.
   */
  async createFinancialVoucher({
    order,
    warehouseId,
    transaction
  }: {
    order: IOrderModel
    warehouseId: number
    transaction: Transaction
  }) {
    try {
      const isImport = order.providerId != null
      const prefix = isImport ? 'PC' : 'PT'
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const code = `${prefix}-${datePart}-${order.id}`
      await FinancialRecord.create(
        {
          code,
          type: isImport ? 'expense' : 'revenue',
          category: isImport ? 'import' : 'sale',
          amount: Number(order.paid),
          relatedType: isImport ? 'importOrder' : 'order',
          relatedId: order.id,
          warehouseId,
          transactionDate: new Date()
        } as any,
        { transaction }
      )
    } catch (error) {
      console.log('createFinancialVoucher error', error)
      throw error
    }
  }
  /**
   * @function getOrders
   * @description Get orders with pagination
   * @param {Object} params - pagination params, warehouseId, isProvider
   * @return {Promise<Object>} - result of query
   */
  /**
   * Update an existing order and adjust inventory by the difference between
   * old and new quantities, so stock always reflects reality.
   * Note: the original transfer/financial voucher records are kept as-is
   * (they document the state at creation time).
   */
  async update(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const scope = getVendorScope(req)
      const { id } = req.params
      const { VAT, surcharge, paymentType, orderDetails, type = '1' } = req.body

      if (!orderDetails || orderDetails.length === 0) {
        throw new Error('Order details are required')
      }

      const order = await Order.findByPk(id, { transaction: t })
      if (!order) {
        throw new Error('Order not found')
      }

      // S1: scoped callers may only update orders in warehouses they own.
      await assertWarehouseAccess(order.warehouseId, scope)
      assertVendorAccess(scope, (order as any).vendorId, 'Unauthorized to update this order')

      const warehouseId = Number(order.warehouseId)

      // Build quantity maps keyed by product+variant to compute deltas
      const keyOf = (item: { productId: number; variantId?: number | null }) =>
        `${item.productId}-${item.variantId ?? 'x'}`

      const oldDetails = await OrderDetail.findAll({
        where: { orderId: order.id },
        transaction: t
      })
      const oldQtyMap = new Map<string, { productId: number; variantId?: number | null; quantity: number }>()
      for (const detail of oldDetails) {
        oldQtyMap.set(keyOf(detail.get() as any), {
          productId: Number(detail.get('productId')),
          variantId: (detail.get('variantId') as number | null) ?? undefined,
          quantity: Number(detail.get('quantity'))
        })
      }
      const newQtyMap = new Map<string, { productId: number; variantId?: number | null; quantity: number }>()
      for (const item of orderDetails) {
        newQtyMap.set(keyOf(item), {
          productId: Number(item.productId),
          variantId: item.variantId ?? undefined,
          quantity: Number(item.quantity)
        })
      }

      // Infer effective type: provider orders are imports (type '0')
      const effectiveType = (order as any).providerId != null ? '0' : type

      // Apply stock adjustments for the difference (delta > 0 means more goods
      // leave for a sale; delta < 0 means goods come back)
      const allKeys = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()])
      for (const key of allKeys) {
        const oldQty = oldQtyMap.get(key)?.quantity ?? 0
        const newQty = newQtyMap.get(key)?.quantity ?? 0
        const delta = newQty - oldQty
        if (delta === 0) continue

        const ref = newQtyMap.get(key) ?? oldQtyMap.get(key)!
        // For sales ('1'): increase => export more, decrease => return stock.
        // For imports ('0'): the opposite.
        const adjustmentType = effectiveType === '0' ? (delta > 0 ? '0' : '1') : delta > 0 ? '1' : '0'
        await this.updateInventory({
          productId: ref.productId,
          variantId: ref.variantId,
          warehouseId,
          quantity: Math.abs(delta),
          transaction: t,
          type: adjustmentType
        })
        // Keep history (transfers) in sync with inventory movements
        await this.createTransfer({
          productId: ref.productId,
          variantId: ref.variantId ?? null,
          warehouseId,
          quantity: Math.abs(delta),
          transaction: t,
          type: adjustmentType
        })
      }

      // Replace the order detail rows
      await OrderDetail.destroy({ where: { orderId: order.id }, transaction: t })
      for (const item of orderDetails) {
        await OrderDetail.create(
          {
            orderId: order.id,
            warehouseId,
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
            price: item.price,
            buyPrice: item.buyPrice,
            note: item.note
          },
          { transaction: t }
        )
      }

      // Recalculate totals the same way create() does
      const totalPrice =
        orderDetails.reduce((total: number, item: any) => (total += Number(item.buyPrice)), 0) + Number(surcharge)
      const totalPaid = Number(totalPrice + (totalPrice / 100) * Number(VAT))

      ;(order as any).price = totalPrice
      ;(order as any).VAT = Number(VAT)
      ;(order as any).surcharge = Number(surcharge)
      ;(order as any).paid = totalPaid
      if (paymentType) {
        ;(order as any).paymentType = paymentType
      }
      await order.save({ transaction: t })

      await t.commit()

      return this.getOrderById(
        {
          id: String(order.id),
          warehouseId: String(warehouseId)
        },
        scope
      )
    } catch (error) {
      console.log('order update error', error)
      await t.rollback()
      throw error
    }
  }

  async getOrders(req: Request) {
    try {
      const params = req.query
      const { offset = 0, limit = 10, warehouseId, isProvider, vendorId } = params

      // S1: warehouseId comes from the query string - verify it belongs to one
      // of the caller's vendors before using it as a filter.
      const scope = getVendorScope(req as any)
      if (!warehouseId) throw new Error('warehouseId is required')
      await assertWarehouseAccess(warehouseId as string, scope)

      const where: any = {
        warehouseId: warehouseId as string
        // providerId: isProvider ? { [Op.ne]: null } : { [Op.eq]: null }
      }
      // S1: vendor filter must be within the caller's vendor scope; scoped
      // users without an explicit filter only ever see their own vendors.
      if (vendorId) {
        assertVendorAccess(scope, Number(vendorId), "Unauthorized to read this vendor's orders")
        where.vendorId = Number(vendorId)
      } else if (scope !== null) {
        where.vendorId = { [Op.in]: scope }
      }
      const queryParams = {
        where,
        include: [
          {
            model: database.orderDetail
          }
        ],
        offset: Number(offset),
        limit: Number(limit),
        distinct: true, // Prevents wrong count / join fan-out with hasMany include
        separate: false
      }
      const resp = await Order.findAndCountAll(queryParams)
      return resp
    } catch (error) {
      console.warn('error', error)
      throw error
    }
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
      // S1: the caller may only read orders inside warehouses they own.
      await assertWarehouseAccess(warehouseId, vendorScope)
      const resp = await Order.findOne({
        where: {
          id: id,
          warehouseId: warehouseId
        },
        include: [
          {
            model: database.orderDetail,
            include: {
              model: Product,
              attributes: []
            }
          }
        ] as IncludeOptions,
        attributes: {
          include: [[this.sequelize.col('orderDetails.product.name'), 'orderDetails.name']]
        }
      })
      return resp
    } catch (error) {
      throw error
    }
  }

  async getOrderCode(id: string, vendorId: string) {
    try {
      const settings = vendorId ? await new SettingService().getForVendor(Number(vendorId)) : null
      const { prefix, suffix } = getCodeFormat(settings?.codePrefix, settings?.codeSuffix, 'order')
      return applyCodeFormat(`ORD${new Date().getFullYear()}${String(id).padStart(5, '0')}`, prefix, suffix)
    } catch (codeError) {
      console.warn('order code generation failed', codeError)
      return undefined
    }
  }
}
