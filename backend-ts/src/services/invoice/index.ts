import database from '#/database'
import Invoice from '#/database/models/invoice'
import { ApiError } from '#/response'
import { IRequestLocal } from '#/types/common'
import { IInvoiceStatic, InvoiceStatus, PaymentType } from '#/types/invoice'
import { isDuplicateEntryError, nextSequence } from '#/utils/sequence'
import { assertVendorAccess, getVendorScope } from '#/utils/tenant'
import { Op, Sequelize } from 'sequelize'

export class InvoiceService {
  invoice: IInvoiceStatic = database.invoice
  sequelize: Sequelize = database.sequelize

  /**
   * Generate invoice number with format: {vendorCode}-{YYYY}-{sequence}
   *
   * The sequence comes from the atomic `sequences` counter
   * (utils/sequence.ts) so concurrent creations for the same vendor can
   * never observe the same number; the unique index on invoices.invoiceNumber
   * is the final safety net (callers retry once on ER_DUP_ENTRY).
   */
  private async generateInvoiceNumber(vendorId: number, year: number, transaction?: any): Promise<string> {
    // Get vendor code (first 3 letters of vendor name in uppercase)
    const vendor = await database.vendor.findByPk(vendorId)
    const vendorCode = vendor?.name?.substring(0, 3).toUpperCase() || 'INV'

    // The transaction pins ONE pooled connection so LAST_INSERT_ID() is
    // read back reliably (it is connection-scoped).
    const seq = await nextSequence(`invoice:${vendorId}`, year, {
      transaction,
      initial: await this.currentMaxSequence(vendorId, vendorCode, year)
    })

    return `${vendorCode}-${year}-${seq.toString().padStart(5, '0')}`
  }

  /** Highest sequence already used by existing invoices - seeds the counter lazily. */
  private async currentMaxSequence(vendorId: number, vendorCode: string, year: number): Promise<number> {
    const lastInvoice = await this.invoice.findOne({
      where: {
        vendorId,
        invoiceNumber: {
          [Op.like]: `${vendorCode}-${year}-%`
        }
      },
      order: [['id', 'DESC']]
    })
    if (!lastInvoice) return 1
    const lastNumber = lastInvoice.invoiceNumber.split('-').pop()
    const parsed = lastNumber ? parseInt(lastNumber, 10) : NaN
    return Number.isFinite(parsed) ? parsed + 1 : 1
  }

  /**
   * Get all invoices with pagination and filtering
   */
  async getInvoices(req: IRequestLocal) {
    const { page = 1, limit = 10, search, vendorId, status, customerId, orderId } = req.query as any
    const offset = (Number(page) - 1) * Number(limit)

    const where: any = {}

    // S1: filter by vendor. Scoped callers may only list their own vendors'
    // invoices; an explicit out-of-scope filter is rejected.
    const scope = getVendorScope(req)
    if (vendorId) {
      assertVendorAccess(scope, Number(vendorId), "Unauthorized to read this vendor's invoices")
      where.vendorId = Number(vendorId)
    } else if (scope !== null) {
      where.vendorId = { [Op.in]: scope }
    }

    // Filter by status
    if (status) {
      where.status = status
    }

    // Filter by customer
    if (customerId) {
      where.customerId = customerId
    }

    // Filter by order (used by order detail page to show the auto-created invoice)
    if (orderId) {
      where.orderId = Number(orderId)
    }

    // Search by invoice number or customer name
    if (search) {
      where[Op.or] = [{ invoiceNumber: { [Op.like]: `%${search}%` } }]
    }

    const { count, rows } = await this.invoice.findAndCountAll({
      where,
      limit: Number(limit),
      offset: Number(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: database.customer,
          attributes: ['id', 'name', 'phone', 'email']
        },
        {
          model: database.vendor,
          attributes: ['id', 'name']
        },
        {
          model: database.warehouse,
          attributes: ['id', 'name']
        },
        {
          model: database.order,
          attributes: ['id', 'code', 'price', 'paymentType', 'channel', 'VAT', 'surcharge']
        },
        {
          model: database.invoiceDetail,
          include: [
            {
              model: database.product,
              attributes: ['id', 'name', 'code', 'skuCode'],
              paranoid: false
            }
          ]
        }
      ]
    })

    return { count, rows }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(req: IRequestLocal) {
    const { id } = req.params

    const invoice = await this.invoice.findByPk(id, {
      include: [
        {
          model: database.customer,
          attributes: ['id', 'name', 'phone', 'email', 'address', 'taxCode']
        },
        {
          model: database.vendor,
          attributes: ['id', 'name']
        },
        {
          model: database.warehouse,
          attributes: ['id', 'name', 'address', 'phone']
        },
        {
          model: database.order,
          attributes: ['id', 'code', 'price', 'paymentType', 'channel', 'VAT', 'surcharge']
        },
        {
          model: database.invoiceDetail,
          include: [
            {
              model: database.product,
              attributes: ['id', 'name', 'code', 'skuCode', 'salePrice'],
              paranoid: false
            }
          ]
        }
      ]
    })

    if (!invoice) {
      throw new Error('Invoice not found')
    }

    // S1: vendor permission - enforced (the old `req.user?.vendorId && ...`
    // check could never fire because auth never set req.user).
    assertVendorAccess(getVendorScope(req), (invoice as any).vendorId, 'Unauthorized to view this invoice')

    return invoice
  }

  /**
   * Create new invoice.
   * Retries once on ER_DUP_ENTRY: invoices.invoiceNumber is UNIQUE as a
   * final safety net against duplicate codes under extreme concurrency.
   */
  async create(req: IRequestLocal) {
    const body: any = (req as any).body ?? {}
    // New per-line API: POST /orders/:id/invoices { lines: [{ order_detail_id, quantity }] }
    // also accepts { orderId, lines } via POST /invoices for backward-compat routing.
    const orderId = body.orderId ?? (req as any).params?.orderId ?? (req as any).params?.id
    try {
      return await this.createAttempt({ ...body, orderId }, getVendorScope(req))
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        return await this.createAttempt({ ...body, orderId }, getVendorScope(req))
      }
      throw error
    }
  }

  /**
   * Core invoice creation from explicit order lines.
   * - Server re-validates quantity <= (ordered - already invoiced) inside the
   *   transaction with row locks, so two concurrent creators cannot oversell.
   * - invoiceType is derived: FULL when the request covers ALL remaining qty
   *   of every order line, otherwise PARTIAL. No manual type from client.
   * - When `externalTx` is given (POS order+invoice in 1 transaction) the
   *   caller owns commit/rollback.
   */
  async createFromOrderLines(
    orderId: number,
    lines: Array<{ order_detail_id: number; quantity: number }>,
    opts: { vendorId?: number; warehouseId?: number; customerId?: number; paymentType?: string; notes?: string; dueDate?: any } = {},
    vendorScope: any = null,
    externalTx?: any
  ) {
    const t = externalTx ?? (await this.sequelize.transaction())
    const ownTx = !externalTx
    try {
      const result = await this.createAttempt(
        {
          orderId,
          lines,
          vendorId: opts.vendorId,
          warehouseId: opts.warehouseId,
          customerId: opts.customerId,
          paymentType: opts.paymentType as any,
          notes: opts.notes,
          dueDate: opts.dueDate,
        } as any,
        vendorScope,
        t
      )
      if (ownTx) await t.commit()
      return result
    } catch (error) {
      if (ownTx) await t.rollback()
      throw error
    }
  }

  /** Read a field from either a Sequelize instance or a plain mock object. */
  private static field(row: any, key: string): any {
    try {
      if (row && typeof row.get === 'function') return row.get(key)
    } catch {}
    return row?.[key]
  }

  /** Invoiced (non-cancelled) quantities per orderDetailId — single source for progress. */
  async getInvoicedMap(orderId: number, transaction?: any): Promise<Map<number, number>> {
    const rows: any[] =
      ((await database.invoiceDetail.findAll({
        attributes: ['orderDetailId', [this.sequelize.fn('SUM', this.sequelize.col('quantity')), 'invoicedQty']],
        include: [{ model: database.invoice, attributes: [], where: { orderId, status: { [Op.ne]: 'cancelled' } } }],
        group: ['orderDetailId'],
        raw: true,
        transaction,
      } as any)) ?? []) as any[]
    const map = new Map<number, number>()
    for (const r of rows) {
      const key = Number(InvoiceService.field(r, 'orderDetailId'))
      if (Number.isFinite(key)) map.set(key, Number(InvoiceService.field(r, 'invoicedQty') ?? 0))
    }
    return map
  }

  private async createAttempt(
    body: {
      orderId: number
      lines?: Array<{ order_detail_id: number; quantity: number }>
      items?: any[]
      customerId?: number
      warehouseId?: number
      vendorId?: number
      VAT?: number
      discount?: number
      surcharge?: number
      paymentType?: 'cash' | 'transfer' | 'credit'
      status?: string
      dueDate?: any
      notes?: string
    },
    vendorScope: any,
    externalTx?: any
  ) {
    const t = externalTx ?? (await this.sequelize.transaction())
    const ownTx = !externalTx
    try {
      const { orderId } = body
      // BUSINESS RULE: an invoice can only be created from an existing order.
      // Stock movement is handled by the order; the invoice is a financial document.
      if (!orderId) {
        throw new Error('orderId is required: invoices can only be created from an order')
      }

      // Lock the order row so concurrent invoice creators serialize here.
      const order: any = await database.order.findByPk(Number(orderId), {
        include: [{ model: database.orderDetail }],
        ...(t?.LOCK?.UPDATE != null ? { lock: t.LOCK.UPDATE } : {}),
        transaction: t,
      })
      if (!order) {
        throw new Error('Order not found')
      }

      const requestedVendorId = (body as any).vendorId
      if (requestedVendorId != null) {
        assertVendorAccess(vendorScope, Number(requestedVendorId), 'Unauthorized to create invoices for this vendor')
      }
      const vendorId = Number(
        requestedVendorId ?? (order as any).vendorId ?? (vendorScope && vendorScope.length ? vendorScope[0] : null)
      )
      if (!vendorId) {
        throw new Error('vendorId is required')
      }

      // S1: enforced - even when falling back to the ORDER's vendor, scoped
      // callers may never mint invoices outside their vendor scope.
      assertVendorAccess(vendorScope, vendorId, 'Unauthorized to create an invoice for this order')

      if ((order as any).vendorId && Number((order as any).vendorId) !== vendorId) {
        throw new Error('Unauthorized to create an invoice for this order')
      }

      // NOTE: multiple invoices per order are allowed (partial deliveries).
      // The old single-invoice guard was removed intentionally.

      const { items, VAT, discount = 0, surcharge, paymentType, status, dueDate, notes, customerId, warehouseId } = body
      // Normalize requested lines: explicit per-line payload wins; legacy
      // `items` (full-order, no quantities) falls back to all remaining qty.
      const invoicedMap = await this.getInvoicedMap(Number(orderId), t)
      const orderDetails: any[] = (order as any).orderDetails ?? []
      if (!orderDetails.length) throw new Error('Order has no items to invoice')
      const F = InvoiceService.field
      const detailById = new Map<number, any>()
      for (const d of orderDetails) detailById.set(Number(F(d, 'id')), d)

      let requested: Array<{ orderDetailId: number; quantity: number }>
      if (body.lines && body.lines.length > 0) {
        requested = body.lines.map((l: any) => ({
          orderDetailId: Number(l.order_detail_id ?? l.orderDetailId),
          quantity: Number(l.quantity),
        }))
      } else if (items && items.length > 0) {
        // Legacy items carry productId only — resolve to order lines with remaining qty.
        requested = []
        for (const item of items) {
          const match = orderDetails.find((d: any) => Number(F(d, 'productId')) === Number(item.productId))
          if (!match) throw new Error(`Product ${item.productId} is not on this order`)
          requested.push({ orderDetailId: Number(F(match, 'id')), quantity: Number(item.quantity) })
        }
      } else {
        // One-click full remainder: every line with remaining qty.
        requested = []
        for (const d of orderDetails) {
          const remainingQty = Number(F(d, 'quantity')) - (invoicedMap.get(Number(F(d, 'id'))) ?? 0)
          if (remainingQty > 0) requested.push({ orderDetailId: Number(F(d, 'id')), quantity: remainingQty })
        }
      }

      // Validate: at least 1 line with qty > 0, each line exists on this order
      // and never exceeds ordered - already invoiced (re-checked in DB tx).
      if (!requested.length) throw new Error('No remaining quantity to invoice on this order')
      const seen = new Set<number>()
      for (const r of requested) {
        if (!Number.isFinite(r.orderDetailId)) throw new Error('order_detail_id is required for each line')
        if (seen.has(r.orderDetailId)) throw new Error(`Duplicate line for order detail ${r.orderDetailId}`)
        seen.add(r.orderDetailId)
        if (!Number.isFinite(r.quantity) || r.quantity <= 0) throw new Error('Invoice quantity must be > 0')
        if (!Number.isInteger(r.quantity)) throw new Error('Invoice quantity must be an integer')
        const od = detailById.get(r.orderDetailId)
        if (!od) throw new Error(`Order detail ${r.orderDetailId} is not on this order`)
        const orderedQty = Number(F(od, 'quantity'))
        const already = invoicedMap.get(r.orderDetailId) ?? 0
        const remainingQty = orderedQty - already
        if (r.quantity > remainingQty) {
          throw new Error(
            `Quantity ${r.quantity} exceeds remaining ${remainingQty} for order detail ${r.orderDetailId} (ordered ${orderedQty}, invoiced ${already})`
          )
        }
      }

      // Derive FULL vs PARTIAL: FULL only when every line with remaining qty
      // is included at its full remaining quantity.
      let isFull = true
      for (const d of orderDetails) {
        const id = Number(F(d, 'id'))
        const remainingQty = Number(F(d, 'quantity')) - (invoicedMap.get(id) ?? 0)
        if (remainingQty <= 0) continue
        const req = requested.find((r) => r.orderDetailId === id)
        if (!req || req.quantity !== remainingQty) {
          isFull = false
          break
        }
      }
      const invoiceType = isFull ? 'FULL' : 'PARTIAL'

      let effectiveVAT = VAT ?? Number((order as any).VAT ?? 0)
      const priorCount = Number(
        (await this.invoice.count({
          where: { orderId: Number(orderId), status: { [Op.ne]: 'cancelled' } },
          transaction: t,
        })) ?? 0
      )
      // Order-level surcharge rides on the single FULL invoice only; partial
      // batches carry 0 so the surcharge is never double-counted.
      const effectiveSurcharge = surcharge !== undefined ? Number(surcharge) : isFull && priorCount === 0 ? Number((order as any).surcharge || 0) : 0
      let effectivePaymentType: string = paymentType as any
      if (!effectivePaymentType || !['cash', 'transfer', 'credit'].includes(effectivePaymentType)) {
        effectivePaymentType = (order as any).paymentType === 'transfer' ? 'transfer' : 'cash'
      }

      const sourceItems = requested.map((r) => {
        const od: any = detailById.get(r.orderDetailId)
        return {
          orderDetailId: r.orderDetailId,
          productId: Number(F(od, 'productId')),
          variantId: (F(od, 'variantId') as number | null) ?? null,
          quantity: r.quantity,
          unitPrice: Number(F(od, 'price') || 0),
          taxRate: Number((order as any).VAT || 0),
          discount: 0,
        }
      })

      // Generate invoice number (inside the transaction: the atomic counter
      // and the insert must share a connection; retry once on the rare race
      // where another creator committed the same number first).
      const currentYear = new Date().getFullYear()
      let invoiceNumber = await this.generateInvoiceNumber(vendorId, currentYear, t)

      // Calculate totals
      let subtotal = 0
      let taxAmount = 0

      const invoiceDetails = sourceItems.map((item: any) => {
        const itemSubtotal = item.quantity * item.unitPrice
        const itemTax = (itemSubtotal * (item.taxRate || 0)) / 100
        const itemDiscount = item.discount || 0

        subtotal += itemSubtotal
        taxAmount += itemTax

        return {
          orderDetailId: item.orderDetailId ?? null,
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: itemDiscount,
          taxRate: item.taxRate || 0,
          taxAmount: itemTax,
          subtotal: itemSubtotal - itemDiscount + itemTax
        }
      })

      const total = subtotal - discount + taxAmount + Number(effectiveSurcharge || 0)
      const isImmediate = effectivePaymentType === 'cash' || effectivePaymentType === 'transfer'
      const paid = isImmediate ? total : 0
      const remaining = total - paid
      // Immediate payment collapses draft->paid, credit stays draft
      const effectiveStatus = isImmediate ? 'paid' : status || 'draft'

      // Create invoice
      const invoice = await Invoice.create(
        {
          invoiceNumber,
          orderId: Number(orderId),
          customerId: customerId ?? (order as any).customerId ?? null,
          vendorId,
          warehouseId: warehouseId ?? (order as any).warehouseId,
          subtotal,
          discount,
          VAT: effectiveVAT || 0,
          taxAmount,
          surcharge: Number(effectiveSurcharge || 0),
          total,
          paid,
          remaining,
          currency: 'VND',
          paymentType: effectivePaymentType as PaymentType,
          status: effectiveStatus as InvoiceStatus,
          invoiceType,
          dueDate,
          notes
        },
        { transaction: t }
      )

      // Create invoice details
      for (const detail of invoiceDetails) {
        await database.invoiceDetail.create(
          {
            invoiceId: invoice.id,
            ...detail
          },
          { transaction: t }
        )
      }

      // Ledger: immediate payment (cash/transfer) books revenue now, inside same Tx as invoice+details
      if (effectiveStatus === 'paid') {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const code = `PT-${datePart}-${invoice.id}`
        await database.financialRecord.create(
          {
            code,
            type: 'revenue',
            category: 'sale',
            amount: Number(total),
            relatedType: 'invoice',
            relatedId: invoice.id,
            warehouseId: warehouseId ?? (order as any).warehouseId,
            transactionDate: new Date()
          } as any,
          { transaction: t }
        )
      }

      if (ownTx) await t.commit()

      // Reload invoice with details
      const createdInvoice = await this.invoice.findByPk(invoice.id, {
        include: [
          {
            model: database.invoiceDetail,
            include: [
              {
                model: database.product,
                attributes: ['id', 'name', 'code', 'skuCode'],
                paranoid: false
              }
            ]
          },
          {
            model: database.customer,
            attributes: ['id', 'name', 'phone', 'email']
          }
        ]
      })

      return createdInvoice
    } catch (error) {
      if (ownTx) await t.rollback()
      throw error
    }
  }

  /**
   * Update invoice
   */
  async update(req: IRequestLocal) {
    const t = await this.sequelize.transaction()

    try {
      const { id } = req.params
      const { customerId, warehouseId, items, VAT, discount, surcharge, paymentType, status, dueDate, notes, paid } =
        req.body

      const invoice = await this.invoice.findByPk(id, {
        include: [database.invoiceDetail]
      })

      if (!invoice) {
        throw new Error('Invoice not found')
      }

      // S1: enforced vendor permission
      assertVendorAccess(getVendorScope(req), (invoice as any).vendorId, 'Unauthorized to update this invoice')

      // Only draft invoices are editable (issued/paid are financially locked)
      if ((invoice as any).status !== 'draft') {
        throw ApiError.from('Only draft invoices can be edited', 400)
      }
      if (status && status !== 'draft') {
        throw ApiError.from('Cannot change status via update; use /status endpoint', 400)
      }

      // Update basic fields
      invoice.customerId = customerId ?? invoice.customerId
      invoice.warehouseId = warehouseId ?? invoice.warehouseId
      invoice.VAT = VAT ?? invoice.VAT
      invoice.discount = discount ?? invoice.discount
      invoice.surcharge = surcharge ?? invoice.surcharge
      invoice.paymentType = paymentType ?? invoice.paymentType
      invoice.dueDate = dueDate ?? invoice.dueDate
      invoice.notes = notes ?? invoice.notes

      if (paid !== undefined) {
        invoice.paid = paid
        invoice.remaining = invoice.total - paid
      }

      // Update items if provided
      if (items && items.length > 0) {
        // Delete existing details
        await database.invoiceDetail.destroy({
          where: { invoiceId: invoice.id },
          transaction: t
        })

        // Recalculate totals
        let subtotal = 0
        let taxAmount = 0

        for (const item of items) {
          const itemSubtotal = item.quantity * item.unitPrice
          const itemTax = (itemSubtotal * (item.taxRate || 0)) / 100
          const itemDiscount = item.discount || 0

          subtotal += itemSubtotal
          taxAmount += itemTax

          await database.invoiceDetail.create(
            {
              invoiceId: invoice.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: itemDiscount,
              taxRate: item.taxRate || 0,
              taxAmount: itemTax,
              subtotal: itemSubtotal - itemDiscount + itemTax
            },
            { transaction: t }
          )
        }

        invoice.subtotal = subtotal
        invoice.taxAmount = taxAmount
        invoice.total = subtotal - invoice.discount + taxAmount + invoice.surcharge
        invoice.remaining = invoice.total - invoice.paid
      }

      await invoice.save({ transaction: t })

      await t.commit()

      // Reload invoice with details
      const updatedInvoice = await this.invoice.findByPk(invoice.id, {
        include: [
          {
            model: database.invoiceDetail,
            include: [
              {
                model: database.product,
                attributes: ['id', 'name', 'code', 'skuCode'],
                paranoid: false
              }
            ]
          },
          {
            model: database.customer,
            attributes: ['id', 'name', 'phone', 'email']
          }
        ]
      })

      return updatedInvoice
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  /**
   * Delete invoice
   */
  async delete(req: IRequestLocal) {
    const t = await this.sequelize.transaction()

    try {
      const { id } = req.params

      const invoice = await this.invoice.findByPk(id)

      if (!invoice) {
        throw new Error('Invoice not found')
      }

      // S1: enforced vendor permission
      assertVendorAccess(getVendorScope(req), (invoice as any).vendorId, 'Unauthorized to delete this invoice')

      // Can only delete draft invoices
      if (invoice.status !== 'draft') {
        throw new Error('Only draft invoices can be deleted')
      }

      await invoice.destroy({ transaction: t })

      await t.commit()

      return { message: 'Invoice deleted successfully' }
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  /**
   * Update invoice status (issue, pay, cancel) with state-machine validation.
   * Ledger (FinancialRecord) is booked exactly once when draft -> issued (for credit)
   * inside the same transaction as the status change.
   */
  async updateStatus(req: IRequestLocal) {
    const t = await this.sequelize.transaction()

    try {
      const { id } = req.params
      const { status, paid } = req.body

      const ALLOWED_TRANSITIONS: Record<string, string[]> = {
        draft: ['issued', 'cancelled'],
        issued: ['paid', 'cancelled'],
        paid: [],
        cancelled: []
      }

      const invoice = await this.invoice.findByPk(id)

      if (!invoice) {
        throw new Error('Invoice not found')
      }

      // S1: enforced vendor permission
      assertVendorAccess(getVendorScope(req), (invoice as any).vendorId, 'Unauthorized to update this invoice')

      const from = (invoice as any).status as string
      if (!status || !ALLOWED_TRANSITIONS[from]?.includes(status)) {
        throw ApiError.from(`Invalid status transition: ${from} -> ${status}`, 400)
      }

      ;(invoice as any).status = status

      if (status === 'issued') {
        ;(invoice as any).remaining = Number((invoice as any).total) - Number((invoice as any).paid || 0)
        // Book revenue (VAT lock) - idempotent: skip if already exists
        const existing = await database.financialRecord.findOne({
          where: { relatedType: 'invoice', relatedId: (invoice as any).id },
          transaction: t
        } as any)
        if (!existing) {
          const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
          const code = `PT-${datePart}-${(invoice as any).id}`
          await database.financialRecord.create(
            {
              code,
              type: 'revenue',
              category: 'sale',
              amount: Number((invoice as any).total),
              relatedType: 'invoice',
              relatedId: (invoice as any).id,
              warehouseId: (invoice as any).warehouseId,
              transactionDate: new Date()
            } as any,
            { transaction: t }
          )
        }
      } else if (status === 'paid') {
        const total = Number((invoice as any).total)
        ;(invoice as any).paid = paid !== undefined ? Number(paid) : total
        ;(invoice as any).remaining = 0
        // Ensure ledger exists (in case invoice was draft->paid incorrectly bypassing issued, book now)
        const existing = await database.financialRecord.findOne({
          where: { relatedType: 'invoice', relatedId: (invoice as any).id },
          transaction: t
        } as any)
        if (!existing) {
          const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
          const code = `PT-${datePart}-${(invoice as any).id}`
          await database.financialRecord.create(
            {
              code,
              type: 'revenue',
              category: 'sale',
              amount: total,
              relatedType: 'invoice',
              relatedId: (invoice as any).id,
              warehouseId: (invoice as any).warehouseId,
              transactionDate: new Date()
            } as any,
            { transaction: t }
          )
        }
      } else if (status === 'cancelled') {
        ;(invoice as any).remaining = 0
      }

      await invoice.save({ transaction: t })

      await t.commit()

      return invoice
    } catch (error) {
      await t.rollback()
      throw error
    }
  }
}
