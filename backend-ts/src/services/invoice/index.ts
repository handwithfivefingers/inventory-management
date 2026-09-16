import database from '#/database'
import { ApiError } from '#/response'
import type { IRequestLocal } from '#/types/common'
import type { IInvoiceModel, IInvoiceStatic, InvoiceStatus, PaymentType } from '#/types/invoice'
import { isDuplicateEntryError } from '#/utils/sequence'
import { assertVendorAccess, assertWarehouseAccess, getRequestedVendorId, getVendorScope, type TVendorScope } from '#/utils/tenant'
import { Op, type Sequelize } from 'sequelize'
import { generateInvoiceNumber } from './invoice-number.generator'
import {
  buildSourceItems,
  calculateLineTotals,
  indexOrderDetailsById,
  isFullCoverageInvoice,
  normalizeRequestedLines,
  readModelField,
  validateRequestedLines
} from './invoice-lines.helper'
import type {
  InvoiceCreationBody,
  InvoiceFinancialDefaults,
  InvoiceLineTotals,
  InvoicePaymentSplit,
  NormalizedInvoiceLine
} from './types'

const MAX_CREATE_ATTEMPTS = 3
const SEQUENCE_PADDING_NOTE = 'Sequence is zero-padded to 5 digits (see invoice-number.generator).'

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['issued', 'cancelled'],
  issued: ['paid', 'cancelled'],
  paid: [],
  cancelled: []
}

const IMMEDIATE_PAYMENT_TYPES = ['cash', 'transfer'] as const

export class InvoiceService {
  invoice: IInvoiceStatic = database.invoice
  sequelize: Sequelize = database.sequelize

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async getInvoices(req: IRequestLocal) {
    const queryFilters = req.query as Record<string, unknown>
    const whereClause = this.buildInvoiceListWhere(req, queryFilters)
    const page = Number(queryFilters.page ?? 1)
    const limit = Number(queryFilters.limit ?? 10)
    const offset = (page - 1) * limit

    const { count, rows } = await this.invoice.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: this.buildInvoiceListIncludes()
    } as never)

    return { count, rows }
  }

  private buildInvoiceListWhere(req: IRequestLocal, queryFilters: Record<string, unknown>): Record<string, unknown> {
    const { search, status, customerId, orderId } = queryFilters as {
      search?: string
      status?: string
      customerId?: string | number
      orderId?: string | number
    }
    // Active vendor: `x-vendor` header first (legacy `?vendorId=` fallback).
    const vendorId = getRequestedVendorId(req) ?? (queryFilters as { vendorId?: string | number }).vendorId
    const whereClause: Record<string, unknown> = {}
    const vendorScope = getVendorScope(req)

    if (vendorId) {
      assertVendorAccess(vendorScope, Number(vendorId), "Unauthorized to read this vendor's invoices")
      whereClause.vendorId = Number(vendorId)
    } else if (vendorScope !== null) {
      whereClause.vendorId = { [Op.in]: vendorScope }
    }

    if (status) whereClause.status = status
    if (customerId) whereClause.customerId = customerId
    if (orderId) whereClause.orderId = Number(orderId)
    if (search) whereClause[Op.or as unknown as string] = [{ invoiceNumber: { [Op.like]: `%${search}%` } }]

    return whereClause
  }

  private buildInvoiceListIncludes(): unknown[] {
    return [
      { model: database.customer, attributes: ['id', 'name', 'phone', 'email'] },
      { model: database.vendor, attributes: ['id', 'name'] },
      { model: database.warehouse, attributes: ['id', 'name'] },
      {
        model: database.order,
        attributes: ['id', 'code', 'price', 'paymentType', 'channel', 'VAT', 'surcharge']
      },
      {
        model: database.invoiceDetail,
        include: [{ model: database.product, attributes: ['id', 'name', 'code', 'skuCode'], paranoid: false }]
      }
    ]
  }

  async getInvoiceById(req: IRequestLocal) {
    const invoiceId = (req.params as { id: string }).id
    const invoice = await this.invoice.findByPk(invoiceId, {
      include: [
        { model: database.customer, attributes: ['id', 'name', 'phone', 'email', 'address', 'taxCode'] },
        { model: database.vendor, attributes: ['id', 'name'] },
        { model: database.warehouse, attributes: ['id', 'name', 'address', 'phone'] },
        {
          model: database.order,
          attributes: ['id', 'code', 'price', 'paymentType', 'channel', 'VAT', 'surcharge']
        },
        {
          model: database.invoiceDetail,
          include: [
            { model: database.product, attributes: ['id', 'name', 'code', 'skuCode', 'salePrice'], paranoid: false }
          ]
        }
      ]
    } as never)

    if (!invoice) throw new Error('Invoice not found')
    assertVendorAccess(
      getVendorScope(req),
      (invoice as { vendorId: number }).vendorId,
      'Unauthorized to view this invoice'
    )
    return invoice
  }

  // ---------------------------------------------------------------------------
  // Creation (orchestrator + small single-purpose steps)
  // ---------------------------------------------------------------------------

  /**
   * Create a new invoice. Retries on ER_DUP_ENTRY: `invoiceNumber` keeps a
   * global UNIQUE index as the final safety net under extreme concurrency.
   * With per-(vendor, warehouse, year) atomic counters + distinct prefixes
   * collisions should never happen; the retry only covers the rare race
   * where two creators commit the same number simultaneously.
   */
  async create(req: IRequestLocal) {
    const requestBody: InvoiceCreationBody = ((req as { body?: InvoiceCreationBody }).body ?? {}) as InvoiceCreationBody
    const params = (req as { params?: Record<string, unknown> }).params ?? {}
    const orderId = requestBody.orderId ?? (params.orderId as number) ?? (params.id as number)
    const vendorScope = getVendorScope(req)

    let lastError: unknown = null
    for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt += 1) {
      try {
        return await this.createAttempt({ ...requestBody, orderId }, vendorScope)
      } catch (error) {
        lastError = error
        if (!isDuplicateEntryError(error) || attempt === MAX_CREATE_ATTEMPTS) throw error
      }
    }
    throw lastError
  }

  async createFromOrderLines(
    orderId: number,
    lines: Array<{ order_detail_id: number; quantity: number }>,
    opts: {
      vendorId?: number
      warehouseId?: number
      customerId?: number
      paymentType?: string
      notes?: string
      dueDate?: unknown
    } = {},
    vendorScope: TVendorScope = null,
    externalTransaction?: unknown
  ) {
    const transaction = (externalTransaction ?? (await this.sequelize.transaction())) as {
      commit: () => Promise<void>
      rollback: () => Promise<void>
    }
    const ownsTransaction = !externalTransaction
    try {
      const createdInvoice = await this.createAttempt(
        {
          orderId,
          lines,
          vendorId: opts.vendorId,
          warehouseId: opts.warehouseId,
          customerId: opts.customerId,
          paymentType: opts.paymentType as InvoiceCreationBody['paymentType'],
          notes: opts.notes,
          dueDate: opts.dueDate
        } as InvoiceCreationBody,
        vendorScope,
        transaction
      )
      if (ownsTransaction) await transaction.commit()
      return createdInvoice
    } catch (error) {
      if (ownsTransaction) await transaction.rollback()
      throw error
    }
  }

  /** Invoiced (non-cancelled) quantities per orderDetailId — single source for progress. */
  async getInvoicedMap(orderId: number, transaction?: unknown): Promise<Map<number, number>> {
    const invoicedRows = (await database.invoiceDetail.findAll({
      attributes: ['orderDetailId', [this.sequelize.fn('SUM', this.sequelize.col('quantity')), 'invoicedQty']],
      include: [{ model: database.invoice, attributes: [], where: { orderId, status: { [Op.ne]: 'cancelled' } } }],
      group: ['orderDetailId'],
      raw: true,
      transaction
    } as never)) as Array<Record<string, unknown>> | null
    const invoicedQuantityByDetailId = new Map<number, number>()
    for (const invoicedRow of invoicedRows ?? []) {
      const detailId = Number(readModelField(invoicedRow, 'orderDetailId'))
      if (Number.isFinite(detailId)) {
        invoicedQuantityByDetailId.set(detailId, Number(readModelField(invoicedRow, 'invoicedQty') ?? 0))
      }
    }
    return invoicedQuantityByDetailId
  }

  private async createAttempt(body: InvoiceCreationBody, vendorScope: TVendorScope, externalTransaction?: unknown) {
    const transaction = (externalTransaction ?? (await this.sequelize.transaction())) as {
      commit: () => Promise<void>
      rollback: () => Promise<void>
      LOCK?: { UPDATE: unknown }
    }
    const ownsTransaction = !externalTransaction
    try {
      const lockedOrder = await this.loadLockedOrder(body.orderId, transaction)
      const vendorId = this.resolveVendorIdForNewInvoice(body.vendorId, lockedOrder, vendorScope)
      const warehouseId = await this.resolveWarehouseIdForNewInvoice(
        body.warehouseId,
        lockedOrder,
        vendorId,
        vendorScope
      )
      const { requestedLines, isFullCoverage } = await this.prepareValidatedOrderLines(body, lockedOrder, transaction)
      const financialDefaults = await this.resolveFinancialDefaults(body, lockedOrder, isFullCoverage, transaction)
      const sourceItems = buildSourceItems({
        requestedLines,
        orderDetailById: indexOrderDetailsById(this.getOrderDetails(lockedOrder)),
        orderVAT: Number(readModelField(lockedOrder, 'VAT') ?? 0)
      })
      const lineTotals = calculateLineTotals(sourceItems)
      const paymentSplit = this.resolvePaymentSplit(lineTotals, body, financialDefaults)
      const invoiceNumber = await generateInvoiceNumber({
        vendorId,
        warehouseId,
        year: new Date().getFullYear(),
        transaction
      })
      void SEQUENCE_PADDING_NOTE

      const createdInvoice = await this.persistInvoiceWithLines({
        body,
        lockedOrder,
        vendorId,
        warehouseId,
        invoiceNumber,
        financialDefaults,
        lineTotals,
        paymentSplit,
        transaction
      })
      await this.bookRevenueForImmediatePayment(createdInvoice, warehouseId, paymentSplit, transaction)

      if (ownsTransaction) await transaction.commit()
      return await this.reloadInvoiceWithRelations(Number((createdInvoice as { id: number }).id))
    } catch (error) {
      if (ownsTransaction) await transaction.rollback()
      throw error
    }
  }

  private getOrderDetails(lockedOrder: unknown): unknown[] {
    return ((readModelField(lockedOrder, 'orderDetails') as unknown[] | undefined) ?? []) as unknown[]
  }

  private async loadLockedOrder(orderId: number, transaction: { LOCK?: { UPDATE: unknown } }) {
    if (!orderId) throw new Error('orderId is required: invoices can only be created from an order')
    const lockedOrder = await database.order.findByPk(Number(orderId), {
      include: [{ model: database.orderDetail }],
      ...(transaction?.LOCK?.UPDATE != null ? { lock: transaction.LOCK.UPDATE } : {}),
      transaction
    } as never)
    if (!lockedOrder) throw new Error('Order not found')
    return lockedOrder
  }

  private resolveVendorIdForNewInvoice(
    requestedVendorId: number | undefined,
    lockedOrder: unknown,
    vendorScope: TVendorScope
  ): number {
    if (requestedVendorId != null) {
      assertVendorAccess(vendorScope, Number(requestedVendorId), 'Unauthorized to create invoices for this vendor')
    }
    const orderVendorId = readModelField(lockedOrder, 'vendorId') as number | null
    const fallbackScopeVendorId = vendorScope && vendorScope.length > 0 ? vendorScope[0] : null
    const vendorId = Number(requestedVendorId ?? orderVendorId ?? fallbackScopeVendorId)
    if (!vendorId) throw new Error('vendorId is required')
    assertVendorAccess(vendorScope, vendorId, 'Unauthorized to create an invoice for this order')
    if (orderVendorId && Number(orderVendorId) !== vendorId) {
      throw new Error('Unauthorized to create an invoice for this order')
    }
    return vendorId
  }

  /**
   * The invoice number is unique per (vendor, warehouse): the effective
   * warehouse must be known and must belong to the invoice vendor, otherwise
   * two warehouses could mint the same readable number.
   */
  private async resolveWarehouseIdForNewInvoice(
    requestedWarehouseId: number | undefined,
    lockedOrder: unknown,
    vendorId: number,
    vendorScope: TVendorScope
  ): Promise<number> {
    const orderWarehouseId = readModelField(lockedOrder, 'warehouseId') as number | null
    const effectiveWarehouseId = Number(requestedWarehouseId ?? orderWarehouseId)
    if (!Number.isFinite(effectiveWarehouseId) || effectiveWarehouseId <= 0) {
      throw new Error('warehouseId is required: invoice numbers are scoped per warehouse and vendor')
    }
    const warehouseVendorId = await assertWarehouseAccess(effectiveWarehouseId, vendorScope)
    if (warehouseVendorId != null && Number(warehouseVendorId) !== Number(vendorId)) {
      throw new Error('Warehouse does not belong to this vendor')
    }
    return effectiveWarehouseId
  }

  private async prepareValidatedOrderLines(
    body: InvoiceCreationBody,
    lockedOrder: unknown,
    transaction: unknown
  ): Promise<{ requestedLines: NormalizedInvoiceLine[]; isFullCoverage: boolean }> {
    const orderDetails = this.getOrderDetails(lockedOrder)
    if (orderDetails.length === 0) throw new Error('Order has no items to invoice')
    const invoicedQuantityByDetailId = await this.getInvoicedMap(Number(readModelField(lockedOrder, 'id')), transaction)
    const requestedLines = normalizeRequestedLines({ body, orderDetails, invoicedQuantityByDetailId })
    validateRequestedLines({
      requestedLines,
      orderDetailById: indexOrderDetailsById(orderDetails),
      invoicedQuantityByDetailId
    })
    const isFullCoverage = isFullCoverageInvoice({ orderDetails, requestedLines, invoicedQuantityByDetailId })
    return { requestedLines, isFullCoverage }
  }

  private async resolveFinancialDefaults(
    body: InvoiceCreationBody,
    lockedOrder: unknown,
    isFullCoverage: boolean,
    transaction: unknown
  ): Promise<InvoiceFinancialDefaults> {
    const orderId = Number(readModelField(lockedOrder, 'id'))
    const priorNonCancelledCount = Number(
      (await this.invoice.count({
        where: { orderId, status: { [Op.ne]: 'cancelled' } },
        transaction
      } as never)) ?? 0
    )
    const effectiveVAT = body.VAT ?? Number(readModelField(lockedOrder, 'VAT') ?? 0)
    // Order-level surcharge rides on the single FULL invoice only; partial
    // batches carry 0 so the surcharge is never double-counted.
    const effectiveSurcharge =
      body.surcharge !== undefined
        ? Number(body.surcharge)
        : isFullCoverage && priorNonCancelledCount === 0
          ? Number(readModelField(lockedOrder, 'surcharge') || 0)
          : 0
    const rawPaymentType = body.paymentType as string | undefined
    const effectivePaymentType =
      rawPaymentType && (['cash', 'transfer', 'credit'] as string[]).includes(rawPaymentType)
        ? (rawPaymentType as InvoiceFinancialDefaults['effectivePaymentType'])
        : readModelField(lockedOrder, 'paymentType') === 'transfer'
          ? 'transfer'
          : 'cash'
    return { effectiveVAT, effectiveSurcharge, effectivePaymentType, priorNonCancelledCount, isFullCoverage }
  }

  private resolvePaymentSplit(
    lineTotals: InvoiceLineTotals,
    body: InvoiceCreationBody,
    financialDefaults: InvoiceFinancialDefaults
  ): InvoicePaymentSplit {
    const discount = Number(body.discount ?? 0)
    const total =
      lineTotals.subtotal - discount + lineTotals.taxAmount + Number(financialDefaults.effectiveSurcharge || 0)
    const isImmediatePayment = (IMMEDIATE_PAYMENT_TYPES as readonly string[]).includes(
      financialDefaults.effectivePaymentType
    )
    const paidAmount = isImmediatePayment ? total : 0
    const remainingAmount = total - paidAmount
    const effectiveStatus = isImmediatePayment ? 'paid' : body.status || 'draft'
    return { total, paidAmount, remainingAmount, effectiveStatus }
  }

  private async persistInvoiceWithLines(params: {
    body: InvoiceCreationBody
    lockedOrder: unknown
    vendorId: number
    warehouseId: number
    invoiceNumber: string
    financialDefaults: InvoiceFinancialDefaults
    lineTotals: InvoiceLineTotals
    paymentSplit: InvoicePaymentSplit
    transaction: unknown
  }) {
    const {
      body,
      lockedOrder,
      vendorId,
      warehouseId,
      invoiceNumber,
      financialDefaults,
      lineTotals,
      paymentSplit,
      transaction
    } = params
    const discount = Number(body.discount ?? 0)
    const orderCustomerId = readModelField(lockedOrder, 'customerId') as number | null
    const createdInvoice = await database.invoice.create(
      {
        invoiceNumber,
        orderId: Number(readModelField(lockedOrder, 'id')),
        customerId: body.customerId ?? orderCustomerId ?? null,
        vendorId,
        warehouseId,
        subtotal: lineTotals.subtotal,
        discount,
        VAT: financialDefaults.effectiveVAT || 0,
        taxAmount: lineTotals.taxAmount,
        surcharge: Number(financialDefaults.effectiveSurcharge || 0),
        total: paymentSplit.total,
        paid: paymentSplit.paidAmount,
        remaining: paymentSplit.remainingAmount,
        currency: 'VND',
        paymentType: financialDefaults.effectivePaymentType as PaymentType,
        status: paymentSplit.effectiveStatus as InvoiceStatus,
        invoiceType: financialDefaults.isFullCoverage ? 'FULL' : 'PARTIAL',
        dueDate: body.dueDate,
        notes: body.notes
      },
      { transaction } as never
    )
    for (const persistableLine of lineTotals.persistableLines) {
      await database.invoiceDetail.create({ invoiceId: (createdInvoice as { id: number }).id, ...persistableLine }, {
        transaction
      } as never)
    }
    return createdInvoice
  }

  private async bookRevenueForImmediatePayment(
    createdInvoice: unknown,
    warehouseId: number,
    paymentSplit: InvoicePaymentSplit,
    transaction: unknown
  ): Promise<void> {
    const invoiceStatus = readModelField(createdInvoice, 'status')
    if (invoiceStatus !== 'paid') return
    const invoiceId = Number(readModelField(createdInvoice, 'id'))
    await database.financialRecord.create(
      {
        code: this.buildRevenueVoucherCode(invoiceId),
        type: 'revenue',
        category: 'sale',
        amount: Number(paymentSplit.total),
        relatedType: 'invoice',
        relatedId: invoiceId,
        warehouseId,
        transactionDate: new Date()
      } as never,
      { transaction } as never
    )
  }

  private buildRevenueVoucherCode(invoiceId: number): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return `PT-${datePart}-${invoiceId}`
  }

  private async reloadInvoiceWithRelations(invoiceId: number) {
    return this.invoice.findByPk(invoiceId, {
      include: [
        {
          model: database.invoiceDetail,
          include: [{ model: database.product, attributes: ['id', 'name', 'code', 'skuCode'], paranoid: false }]
        },
        { model: database.customer, attributes: ['id', 'name', 'phone', 'email'] }
      ]
    } as never)
  }

  // ---------------------------------------------------------------------------
  // Update / delete
  // ---------------------------------------------------------------------------

  async update(req: IRequestLocal) {
    const transaction = await this.sequelize.transaction()
    try {
      const invoiceId = (req.params as { id: string }).id
      const editableFields = req.body as {
        customerId?: number
        warehouseId?: number
        items?: Array<{ productId: number; quantity: number; unitPrice: number; taxRate?: number; discount?: number }>
        VAT?: number
        discount?: number
        surcharge?: number
        paymentType?: PaymentType
        status?: string
        dueDate?: unknown
        notes?: string
        paid?: number
      }

      const invoice = await this.loadDraftInvoiceForUpdate(invoiceId, req)
      this.applyHeaderFieldUpdates(invoice, editableFields)
      if (editableFields.items && editableFields.items.length > 0) {
        await this.rebuildInvoiceLines(invoice as { id: number }, editableFields.items, transaction)
        this.recalculateHeaderTotals(invoice, editableFields.items)
      }

      await invoice.save({ transaction })
      await transaction.commit()
      return await this.reloadInvoiceWithRelations(Number((invoice as { id: number }).id))
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  private async loadDraftInvoiceForUpdate(invoiceId: string | number, req: IRequestLocal) {
    const _invoice = await this.invoice.findByPk(invoiceId, { include: [database.invoiceDetail] } as never)
    if (!_invoice) throw new Error('Invoice not found')
    assertVendorAccess(
      getVendorScope(req),
      (_invoice as { vendorId: number }).vendorId,
      'Unauthorized to update this invoice'
    )
    if ((_invoice as { status: string }).status !== 'draft') {
      throw ApiError.from('Only draft invoices can be edited', 400)
    }
    const requestedStatus = (req.body as { status?: string }).status
    if (requestedStatus && requestedStatus !== 'draft') {
      throw ApiError.from('Cannot change status via update; use /status endpoint', 400)
    }
    return _invoice
  }

  private applyHeaderFieldUpdates(
    invoice: IInvoiceModel,
    editableFields: {
      customerId?: number
      warehouseId?: number
      VAT?: number
      discount?: number
      surcharge?: number
      paymentType?: PaymentType
      dueDate?: unknown
      notes?: string
      paid?: number
    }
  ): void {
    if (editableFields.customerId) invoice.customerId = editableFields.customerId
    if (editableFields.warehouseId) invoice.warehouseId = editableFields.warehouseId
    if (editableFields.VAT) invoice.VAT = editableFields.VAT
    if (editableFields.discount) invoice.discount = editableFields.discount
    if (editableFields.surcharge) invoice.surcharge = editableFields.surcharge
    if (editableFields.paymentType) invoice.paymentType = editableFields.paymentType
    if (editableFields.dueDate) invoice.dueDate = editableFields.dueDate as Date
    if (editableFields.notes) invoice.notes = editableFields.notes
    if (editableFields.paid) {
      invoice.paid = editableFields.paid
      invoice.remaining = Number(invoice.total) - Number(editableFields.paid)
    }
  }

  private async rebuildInvoiceLines(
    invoice: { id: number },
    updateItems: Array<{ productId: number; quantity: number; unitPrice: number; taxRate?: number; discount?: number }>,
    transaction: unknown
  ): Promise<void> {
    await database.invoiceDetail.destroy({ where: { invoiceId: invoice.id }, transaction } as never)
    const sourceItems = updateItems.map((updateItem) => ({
      orderDetailId: 0,
      productId: updateItem.productId,
      variantId: null as number | null,
      quantity: updateItem.quantity,
      unitPrice: updateItem.unitPrice,
      taxRate: updateItem.taxRate || 0,
      discount: updateItem.discount || 0
    }))
    const { persistableLines } = calculateLineTotals(sourceItems)
    for (let lineIndex = 0; lineIndex < updateItems.length; lineIndex += 1) {
      const updateItem = updateItems[lineIndex]
      const pricedLine = persistableLines[lineIndex]
      await database.invoiceDetail.create(
        {
          invoiceId: invoice.id,
          productId: updateItem.productId,
          quantity: updateItem.quantity,
          unitPrice: updateItem.unitPrice,
          discount: pricedLine.discount,
          taxRate: pricedLine.taxRate,
          taxAmount: pricedLine.taxAmount,
          subtotal: pricedLine.subtotal
        } as never,
        { transaction } as never
      )
    }
  }

  private recalculateHeaderTotals(
    invoice: IInvoiceModel,
    updateItems: Array<{ quantity: number; unitPrice: number; taxRate?: number; discount?: number }>
  ): void {
    const sourceItems = updateItems.map((updateItem) => ({
      orderDetailId: 0,
      productId: 0,
      variantId: null as number | null,
      quantity: updateItem.quantity,
      unitPrice: updateItem.unitPrice,
      taxRate: updateItem.taxRate || 0,
      discount: updateItem.discount || 0
    }))
    const { subtotal, taxAmount } = calculateLineTotals(sourceItems)
    invoice.subtotal = subtotal
    invoice.taxAmount = taxAmount
    invoice.total = subtotal - Number(invoice.discount) + taxAmount + Number(invoice.surcharge)
    invoice.remaining = Number(invoice.total) - Number(invoice.paid)
  }

  async delete(req: IRequestLocal) {
    const transaction = await this.sequelize.transaction()
    try {
      const invoiceId = (req.params as { id: string }).id
      const invoice = await this.invoice.findByPk(invoiceId)
      if (!invoice) throw new Error('Invoice not found')
      assertVendorAccess(
        getVendorScope(req),
        (invoice as { vendorId: number }).vendorId,
        'Unauthorized to delete this invoice'
      )
      if ((invoice as { status: string }).status !== 'draft') {
        throw new Error('Only draft invoices can be deleted')
      }
      await (invoice as { destroy: (options: unknown) => Promise<void> }).destroy({ transaction })
      await transaction.commit()
      return { message: 'Invoice deleted successfully' }
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  // ---------------------------------------------------------------------------
  // Status transitions
  // ---------------------------------------------------------------------------

  async updateStatus(req: IRequestLocal) {
    const transaction = await this.sequelize.transaction()
    try {
      const invoiceId = (req.params as { id: string }).id
      const { status: targetStatus, paid: paidOverride } = req.body as { status: string; paid?: number }
      const invoice = await this.loadInvoiceForStatusChange(invoiceId, req)
      this.assertValidStatusTransition((invoice as { status: string }).status, targetStatus)
      await this.applyStatusChange(
        invoice as { id: number; status: string; total: number; paid: number; remaining: number; warehouseId: number },
        targetStatus,
        paidOverride,
        transaction
      )
      await invoice.save({ transaction })
      await transaction.commit()
      return invoice
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  private async loadInvoiceForStatusChange(invoiceId: string | number, req: IRequestLocal) {
    const invoice = await this.invoice.findByPk(invoiceId)
    if (!invoice) throw new Error('Invoice not found')
    assertVendorAccess(
      getVendorScope(req),
      (invoice as { vendorId: number }).vendorId,
      'Unauthorized to update this invoice'
    )
    return invoice
  }

  private assertValidStatusTransition(currentStatus: string, targetStatus: string): void {
    if (!targetStatus || !ALLOWED_STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus)) {
      throw ApiError.from(`Invalid status transition: ${currentStatus} -> ${targetStatus}`, 400)
    }
  }

  private async applyStatusChange(
    invoice: { id: number; status: string; total: number; paid: number; remaining: number; warehouseId: number },
    targetStatus: string,
    paidOverride: number | undefined,
    transaction: unknown
  ): Promise<void> {
    invoice.status = targetStatus
    if (targetStatus === 'issued') {
      invoice.remaining = Number(invoice.total) - Number(invoice.paid || 0)
    } else if (targetStatus === 'paid') {
      invoice.paid = paidOverride !== undefined ? Number(paidOverride) : Number(invoice.total)
      invoice.remaining = 0
    } else if (targetStatus === 'cancelled') {
      invoice.remaining = 0
    }
    if (targetStatus === 'issued' || targetStatus === 'paid') {
      await this.ensureRevenueRecordExists(invoice, transaction)
    }
  }

  private async ensureRevenueRecordExists(
    invoice: { id: number; total: number; warehouseId: number },
    transaction: unknown
  ): Promise<void> {
    const existingRecord = await database.financialRecord.findOne({
      where: { relatedType: 'invoice', relatedId: invoice.id },
      transaction
    } as never)
    if (existingRecord) return
    await database.financialRecord.create(
      {
        code: this.buildRevenueVoucherCode(invoice.id),
        type: 'revenue',
        category: 'sale',
        amount: Number(invoice.total),
        relatedType: 'invoice',
        relatedId: invoice.id,
        warehouseId: invoice.warehouseId,
        transactionDate: new Date()
      } as never,
      { transaction } as never
    )
  }
}
