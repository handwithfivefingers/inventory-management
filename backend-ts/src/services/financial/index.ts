import database from '#/database'
import { IFinancialRecordStatic } from '#/types/financialRecord'
import { IOrderStatic } from '#/types/order'
import { ITransferStatic } from '#/types/transfer'
import { getPagination } from '#/utils'
import { assertWarehouseAccess } from '#/utils/tenant'
import type { TVendorScope } from '#/utils/tenant'
import { FindAttributeOptions, Op, Sequelize } from 'sequelize'

export class FinancialService {
  transfer: ITransferStatic = database.transfer
  financialRecord: IFinancialRecordStatic = database.financialRecord
  order: IOrderStatic = database.order
  sequelize: Sequelize = database.sequelize

  /** Legacy view: transfers grouped by day/type (kept for compatibility). */
  async getFinancial(req: any) {
    try {
      const { offset, limit } = getPagination(req.query)
      const queryParams = {
        where: {
          warehouseId: req.query.warehouse
        },
        offset,
        limit,
        include: [
          {
            model: database.product,
            required: false
          }
        ],
        attributes: [
          'updatedAt',
          'type',
          [this.sequelize.literal('SUM(product.regularPrice * transfer.quantity)'), 'totalPrice']
        ] as FindAttributeOptions,
        group: ['updatedAt', 'type'],
        raw: true
      }
      const resp = await this.transfer.findAndCountAll(queryParams)
      return resp
    } catch (error) {
      console.log('error', error)
      throw error
    }
  }

  /** List vouchers (financial_records) with filters. */
  async getVouchers(req: any) {
    try {
      const { offset, limit, warehouseId } = getPagination(req.query)
      const where: any = {}
      if (warehouseId) where.warehouseId = Number(warehouseId)
      if (req.query.type) where.type = req.query.type
      if (req.query.category) where.category = req.query.category
      const { from, to } = req.query
      if (from || to) {
        where.transactionDate = {}
        if (from) where.transactionDate[Op.gte] = new Date(from)
        if (to) where.transactionDate[Op.lte] = new Date(`${to} 23:59:59`)
      }
      const resp = await this.financialRecord.findAndCountAll({
        where,
        include: [{ model: database.staff }, { model: database.warehouse }],
        offset: Number(offset),
        limit: Number(limit),
        distinct: true,
        order: [['transactionDate', 'DESC']]
      })
      return resp
    } catch (error) {
      console.log('getVouchers error', error)
      throw error
    }
  }

  async getVoucherById(id: string | number) {
    try {
      return await this.financialRecord.findByPk(id, {
        include: [{ model: database.staff }, { model: database.warehouse }]
      })
    } catch (error) {
      throw error
    }
  }

  /** Create a manual voucher, auto-generating its code. */
  async createVoucher(body: any) {
    try {
      const prefix = body.type === 'expense' ? 'PC' : 'PT'
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const likePattern = `${prefix}-${datePart}-%`
      const last = await this.financialRecord.findOne({
        where: { code: { [Op.like]: likePattern } },
        order: [['id', 'DESC']],
        raw: true
      })
      const seq = last ? Number((last as any).code.split('-').pop()) + 1 : 1
      const code = `${prefix}-${datePart}-${String(seq).padStart(4, '0')}`
      return await this.financialRecord.create({
        ...body,
        code,
        transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date()
      } as any)
    } catch (error) {
      console.log('createVoucher error', error)
      throw error
    }
  }

  /**
   * Tax-ready summary for a period.
   * Revenue & expenses come from the financial_records book (auto + manual vouchers).
   * VAT collected is summed from issued/paid invoices' taxAmount (financial truth),
   * not from orders - invoices are the legal VAT document.
   */
  async getReport(
    { from, to, warehouseId }: { from?: string; to?: string; warehouseId?: string },
    vendorScope: TVendorScope = null
  ) {
    try {
      // --- Bug 1: tenant isolation --- ensure warehouse belongs to caller
      if (warehouseId) {
        await assertWarehouseAccess(warehouseId, vendorScope)
      }

      // --- Bug 7: validate range --- from > to is a client error
      if (from && to) {
        const f = new Date(from)
        const tt = new Date(`${to}T23:59:59.999`)
        if (!isNaN(f.getTime()) && !isNaN(tt.getTime()) && f.getTime() > tt.getTime()) {
          const err = new Error('Invalid date range: from must be <= to') as Error & { status?: number }
          err.status = 400
          throw err
        }
      }

      // --- Bug 3: consistent timezone handling --- use local-consistent T00:00:00 / T23:59:59.999
      const buildDateRange = (f?: string, t?: string) => {
        const range: any = {}
        let has = false
        if (f) {
          const d = new Date(`${f}T00:00:00.000`)
          if (!isNaN(d.getTime())) {
            range[Op.gte] = d
            has = true
          }
        }
        if (t) {
          const d = new Date(`${t}T23:59:59.999`)
          if (!isNaN(d.getTime())) {
            range[Op.lte] = d
            has = true
          }
        }
        return has ? range : null
      }

      const whereRecords: any = {}
      if (warehouseId) whereRecords.warehouseId = Number(warehouseId)
      const txRange = buildDateRange(from, to)
      if (txRange) whereRecords.transactionDate = txRange

      const sumBy = async (type: 'revenue' | 'expense', category?: string) => {
        const w: any = { ...whereRecords, type }
        if (category) w.category = category
        const r = await this.financialRecord.findOne({
          where: w,
          attributes: [[this.sequelize.fn('SUM', this.sequelize.col('amount')), 'total']],
          raw: true
        })
        // BIGINT SUM returns string; safe for <= 2^53 VND, otherwise use BigInt path
        return Number((r as any)?.total) || 0
      }

      const revenue = await sumBy('revenue')
      const importCost = await sumBy('expense', 'import')
      const totalExpense = await sumBy('expense')
      // Bug 8: clamp otherExpense to avoid negative due to data race / missing category
      const otherExpense = Math.max(0, totalExpense - importCost)
      const netProfit = revenue - totalExpense

      // VAT collected from issued/paid invoices (financial truth) in the same period
      const invoiceWhere: any = { status: { [Op.in]: ['issued', 'paid'] } }
      if (warehouseId) invoiceWhere.warehouseId = Number(warehouseId)
      const invoiceRange = buildDateRange(from, to)
      if (invoiceRange) invoiceWhere.createdAt = invoiceRange
      const invoices = await (database as any).invoice.findAll({
        where: invoiceWhere,
        attributes: ['taxAmount'],
        raw: true
      })
      const vatCollected = invoices.reduce((s: number, inv: any) => s + Number(inv.taxAmount || 0), 0)
      // Bug 4: expose net revenue (VAT-exclusive) for tax clarity
      const netRevenue = Math.max(0, revenue - vatCollected)

      return { revenue, importCost, otherExpense, totalExpense, netProfit, vatCollected, netRevenue }
    } catch (error) {
      console.log('getReport error', error)
      throw error
    }
  }
}

export default FinancialService
