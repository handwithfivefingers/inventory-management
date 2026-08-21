import database from '#/database'
import { IFinancialRecordStatic } from '#/types/financialRecord'
import { IOrderStatic } from '#/types/order'
import { ITransferStatic } from '#/types/transfer'
import { getPagination } from '#/utils'
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
   * VAT collected is estimated from sales orders in the same period.
   */
  async getReport({ from, to, warehouseId }: { from?: string; to?: string; warehouseId?: string }) {
    try {
      const whereRecords: any = {}
      if (warehouseId) whereRecords.warehouseId = Number(warehouseId)
      if (from || to) {
        whereRecords.transactionDate = {}
        if (from) whereRecords.transactionDate[Op.gte] = new Date(from)
        if (to) whereRecords.transactionDate[Op.lte] = new Date(`${to} 23:59:59`)
      }

      const sumBy = async (type: 'revenue' | 'expense', category?: string) => {
        const w: any = { ...whereRecords, type }
        if (category) w.category = category
        const r = await this.financialRecord.findOne({
          where: w,
          attributes: [[this.sequelize.fn('SUM', this.sequelize.col('amount')), 'total']],
          raw: true
        })
        return Number((r as any)?.total) || 0
      }

      const revenue = await sumBy('revenue')
      const importCost = await sumBy('expense', 'import')
      const totalExpense = await sumBy('expense')
      const otherExpense = totalExpense - importCost
      const netProfit = revenue - totalExpense

      // VAT collected from sales orders (no provider) in the same period
      const orderWhere: any = { providerId: { [Op.eq]: null } }
      if (warehouseId) orderWhere.warehouseId = Number(warehouseId)
      if (from || to) {
        orderWhere.createdAt = {}
        if (from) orderWhere.createdAt[Op.gte] = new Date(from)
        if (to) orderWhere.createdAt[Op.lte] = new Date(`${to} 23:59:59`)
      }
      const orders = await this.order.findAll({
        where: orderWhere,
        attributes: ['price', 'VAT'],
        raw: true
      })
      const vatCollected = orders.reduce(
        (s: number, o: any) => s + (Number(o.price) * (Number(o.VAT) || 0)) / 100,
        0
      )

      return { revenue, importCost, otherExpense, totalExpense, netProfit, vatCollected }
    } catch (error) {
      console.log('getReport error', error)
      throw error
    }
  }
}

export default FinancialService
