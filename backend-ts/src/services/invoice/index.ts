import database from '#/database'
import { IRequestLocal } from '#/types/common'
import { IInvoiceStatic } from '#/types/invoice'
import { assertVendorAccess, getVendorScope } from '#/utils/tenant'
import { isDuplicateEntryError, nextSequence } from '#/utils/sequence'
import { Sequelize } from 'sequelize'
import { Op } from 'sequelize'
import { ApiError } from '#/response'

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
    const { page = 1, limit = 10, search, vendorId, status, customerId } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const where: any = {}

    // S1: filter by vendor. Scoped callers may only list their own vendors'
    // invoices; an explicit out-of-scope filter is rejected.
    const scope = getVendorScope(req)
    if (vendorId) {
      assertVendorAccess(scope, Number(vendorId), 'Unauthorized to read this vendor\'s invoices')
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

    // Search by invoice number or customer name
    if (search) {
      where[Op.or] = [
        { invoiceNumber: { [Op.like]: `%${search}%` } }
      ]
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
          attributes: ['id', 'price', 'paymentType']
        },
        {
          model: database.invoiceDetail,
          include: [
            {
              model: database.product,
              attributes: ['id', 'name', 'code', 'skuCode']
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
          attributes: ['id', 'price', 'paymentType', 'VAT', 'surcharge']
        },
        {
          model: database.invoiceDetail,
          include: [
            {
              model: database.product,
              attributes: ['id', 'name', 'code', 'skuCode', 'salePrice']
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
    try {
      return await this.createAttempt(req)
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        return await this.createAttempt(req)
      }
      throw error
    }
  }

  private async createAttempt(req: IRequestLocal) {
    const t = await this.sequelize.transaction()

    try {
      const {
        orderId,
        customerId,
        warehouseId,
        items,
        VAT,
        discount = 0,
        surcharge = 0,
        paymentType = 'cash',
        status = 'draft',
        dueDate,
        notes
      } = req.body

      // BUSINESS RULE: an invoice can only be created from an existing order.
      // Stock movement is handled by the order; the invoice is a financial document.
      if (!orderId) {
        throw new Error('orderId is required: invoices can only be created from an order')
      }

      // Validate that the order exists
      const order = await database.order.findByPk(Number(orderId), {
        include: [{ model: database.orderDetail }]
      })
      if (!order) {
        throw new Error('Order not found')
      }

      // Resolve vendorId: explicit body value > authenticated user's primary
      // vendor > the order's own vendor. Scoped callers must stay inside
      // their vendor scope.
      const scope = getVendorScope(req)
      const requestedVendorId = (req.body as any).vendorId ?? (req as any).user?.vendorId
      if (requestedVendorId != null) {
        assertVendorAccess(scope, Number(requestedVendorId), 'Unauthorized to create invoices for this vendor')
      }
      const vendorId = Number(
        requestedVendorId || (order as any).vendorId || (scope && scope.length ? scope[0] : null)
      )
      if (!vendorId) {
        throw new Error('vendorId is required')
      }

      // S1: enforced - even when falling back to the ORDER's vendor, scoped
      // callers may never mint invoices outside their vendor scope.
      assertVendorAccess(scope, vendorId, 'Unauthorized to create an invoice for this order')

      if ((order as any).vendorId && Number((order as any).vendorId) !== vendorId) {
        throw new Error('Unauthorized to create an invoice for this order')
      }

      // Prevent duplicate invoices for the same order (cancelled ones don't count)
      const existingInvoice = await this.invoice.findOne({
        where: { orderId: Number(orderId), status: { [Op.ne]: 'cancelled' } },
        transaction: t
      })
      if (existingInvoice) {
        throw new Error(`This order already has invoice ${existingInvoice.invoiceNumber}`)
      }

      // If no items are provided, derive them from the order details so an
      // invoice can be generated from an order in one click
      let sourceItems = items
      let effectiveVAT = VAT
      let effectiveSurcharge = surcharge
      let effectivePaymentType = paymentType
      if (!sourceItems || sourceItems.length === 0) {
        const details = (order as any).orderDetails ?? []
        if (!details.length) {
          throw new Error('Order has no items to invoice')
        }
        sourceItems = details.map((detail: any) => ({
          productId: detail.productId,
          quantity: Number(detail.quantity),
          unitPrice: Number(detail.price || 0),
          taxRate: Number((order as any).VAT || 0)
        }))
        effectiveVAT = effectiveVAT ?? undefined
        effectiveSurcharge =
          surcharge === undefined ? Number((order as any).surcharge || 0) : surcharge
        if (!paymentType || !['cash', 'transfer', 'credit'].includes(paymentType)) {
          effectivePaymentType = (order as any).paymentType === 'transfer' ? 'transfer' : 'cash'
        }
      }

      // Validate required fields
      if (!sourceItems || sourceItems.length === 0) {
        throw new Error('Invoice items are required')
      }

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
          productId: item.productId,
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
      const invoice = await this.invoice.create(
        {
          invoiceNumber,
          orderId: Number(orderId),
          customerId,
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
          paymentType: effectivePaymentType,
          status: effectiveStatus,
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

      await t.commit()

      // Reload invoice with details
      const createdInvoice = await this.invoice.findByPk(invoice.id, {
        include: [
          {
            model: database.invoiceDetail,
            include: [
              {
                model: database.product,
                attributes: ['id', 'name', 'code', 'skuCode']
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
      await t.rollback()
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
      const {
        customerId,
        warehouseId,
        items,
        VAT,
        discount,
        surcharge,
        paymentType,
        status,
        dueDate,
        notes,
        paid
      } = req.body

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
                attributes: ['id', 'name', 'code', 'skuCode']
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
