import database from '#/database'
import { IRequestLocal } from '#/types/common'
import { IInvoiceStatic } from '#/types/invoice'
import { Sequelize } from 'sequelize'
import { Op } from 'sequelize'

export class InvoiceService {
  invoice: IInvoiceStatic = database.invoice
  sequelize: Sequelize = database.sequelize

  /**
   * Generate invoice number with format: {vendorCode}-{YYYY}-{sequence}
   */
  private async generateInvoiceNumber(vendorId: number, year: number): Promise<string> {
    // Get vendor code (first 3 letters of vendor name in uppercase)
    const vendor = await database.vendor.findByPk(vendorId)
    const vendorCode = vendor?.name?.substring(0, 3).toUpperCase() || 'INV'

    // Get the last invoice number for this vendor and year
    const lastInvoice = await this.invoice.findOne({
      where: {
        vendorId,
        invoiceNumber: {
          [Op.like]: `${vendorCode}-${year}-%`
        }
      },
      order: [['id', 'DESC']]
    })

    // Extract sequence number from last invoice or start from 1
    let sequence = 1
    if (lastInvoice) {
      const lastNumber = lastInvoice.invoiceNumber.split('-').pop()
      if (lastNumber) {
        sequence = parseInt(lastNumber, 10) + 1
      }
    }

    // Format sequence with leading zeros (5 digits)
    const sequenceStr = sequence.toString().padStart(5, '0')

    return `${vendorCode}-${year}-${sequenceStr}`
  }

  /**
   * Get all invoices with pagination and filtering
   */
  async getInvoices(req: IRequestLocal) {
    const { page = 1, limit = 10, search, vendorId, status, customerId } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const where: any = {}

    // Filter by vendor
    if (vendorId) {
      where.vendorId = vendorId
    } else if (req.user?.vendorId) {
      where.vendorId = req.user.vendorId
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

    // Check vendor permission
    if (req.user?.vendorId && invoice.vendorId !== req.user.vendorId) {
      throw new Error('Unauthorized to view this invoice')
    }

    return invoice
  }

  /**
   * Create new invoice
   */
  async create(req: IRequestLocal) {
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

      // Validate required fields
      if (!items || items.length === 0) {
        throw new Error('Invoice items are required')
      }

      // Determine vendorId
      const vendorId = req.user?.vendorId
      if (!vendorId) {
        throw new Error('vendorId is required')
      }

      // Generate invoice number
      const currentYear = new Date().getFullYear()
      const invoiceNumber = await this.generateInvoiceNumber(vendorId, currentYear)

      // Calculate totals
      let subtotal = 0
      let taxAmount = 0

      const invoiceDetails = items.map((item: any) => {
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

      const total = subtotal - discount + taxAmount + surcharge
      const paid = paymentType === 'cash' ? total : 0
      const remaining = total - paid

      // Create invoice
      const invoice = await this.invoice.create(
        {
          invoiceNumber,
          orderId,
          customerId,
          vendorId,
          warehouseId,
          subtotal,
          discount,
          VAT: VAT || 0,
          taxAmount,
          surcharge,
          total,
          paid,
          remaining,
          currency: 'VND',
          paymentType,
          status,
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

      // Check vendor permission
      if (req.user?.vendorId && invoice.vendorId !== req.user.vendorId) {
        throw new Error('Unauthorized to update this invoice')
      }

      // Update basic fields
      invoice.customerId = customerId ?? invoice.customerId
      invoice.warehouseId = warehouseId ?? invoice.warehouseId
      invoice.VAT = VAT ?? invoice.VAT
      invoice.discount = discount ?? invoice.discount
      invoice.surcharge = surcharge ?? invoice.surcharge
      invoice.paymentType = paymentType ?? invoice.paymentType
      invoice.status = status ?? invoice.status
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

      // Check vendor permission
      if (req.user?.vendorId && invoice.vendorId !== req.user.vendorId) {
        throw new Error('Unauthorized to delete this invoice')
      }

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
   * Update invoice status (issue, pay, cancel)
   */
  async updateStatus(req: IRequestLocal) {
    const t = await this.sequelize.transaction()

    try {
      const { id } = req.params
      const { status, paid } = req.body

      const invoice = await this.invoice.findByPk(id)

      if (!invoice) {
        throw new Error('Invoice not found')
      }

      // Check vendor permission
      if (req.user?.vendorId && invoice.vendorId !== req.user.vendorId) {
        throw new Error('Unauthorized to update this invoice')
      }

      invoice.status = status

      if (status === 'paid' && paid !== undefined) {
        invoice.paid = paid
        invoice.remaining = 0
      } else if (status === 'issued') {
        invoice.remaining = invoice.total - invoice.paid
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
