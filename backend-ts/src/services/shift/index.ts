import database from '#/database'
import { IFinancialRecordStatic } from '#/types/financialRecord'
import { IShiftStatic } from '#/types/shift'
import { getPagination } from '#/utils'
import { Op, Sequelize } from 'sequelize'

export class ShiftService {
  shift: IShiftStatic = database.shift
  financialRecord: IFinancialRecordStatic = database.financialRecord
  sequelize: Sequelize = database.sequelize

  async getShifts(req: any) {
    try {
      const { offset, limit, warehouseId } = getPagination(req.query)
      const where: any = {}
      if (warehouseId) where.warehouseId = Number(warehouseId)
      if (req.query.status) where.status = req.query.status
      const resp = await this.shift.findAndCountAll({
        where,
        include: [{ model: database.staff }],
        offset: Number(offset),
        limit: Number(limit),
        distinct: true,
        order: [['openTime', 'DESC']]
      })
      return resp
    } catch (error) {
      console.log('getShifts error', error)
      throw error
    }
  }

  async getById(id: string | number) {
    try {
      return await this.shift.findByPk(id, { include: [{ model: database.staff }] })
    } catch (error) {
      throw error
    }
  }

  async getCurrent(warehouseId?: string) {
    try {
      return await this.shift.findOne({
        where: {
          status: 'open',
          ...(warehouseId ? { warehouseId: Number(warehouseId) } : {})
        },
        include: [{ model: database.staff }],
        order: [['openTime', 'DESC']]
      })
    } catch (error) {
      throw error
    }
  }

  async open(body: any) {
    try {
      const count = await this.shift.count()
      const code = `CA-${String(count + 1).padStart(4, '0')}`
      return await this.shift.create({
        code,
        staffId: body.staffId ? Number(body.staffId) : null,
        warehouseId: body.warehouseId ? Number(body.warehouseId) : null,
        openingCash: Number(body.openingCash) || 0,
        openTime: new Date(),
        status: 'open',
        note: body.note
      } as any)
    } catch (error) {
      console.log('shift open error', error)
      throw error
    }
  }

  async close(id: number, body: any) {
    try {
      const shift = await this.shift.findByPk(id)
      if (!shift) throw new Error('Shift not found')
      if (shift.status === 'closed') throw new Error('Shift already closed')

      const openingCash = Number(shift.openingCash) || 0
      const closingCash = Number(body.closingCash) || 0
      const actualCash = closingCash

      // Expected cash = opening + net of vouchers (revenue - expense) since shift open
      const records = await this.financialRecord.findAll({
        where: {
          warehouseId: shift.warehouseId,
          transactionDate: { [Op.gte]: shift.openTime as Date }
        },
        attributes: [
          [this.sequelize.literal("SUM(CASE WHEN type='revenue' THEN amount ELSE -amount END)"), 'net']
        ],
        raw: true
      })
      const net = Number((records[0] as any)?.net) || 0
      const expectedCash = openingCash + net
      const difference = closingCash - expectedCash

      await shift.update({
        closeTime: new Date(),
        closingCash,
        actualCash,
        expectedCash,
        difference,
        status: 'closed',
        note: body.note ?? shift.note
      })
      return shift
    } catch (error) {
      console.log('shift close error', error)
      throw error
    }
  }
}

export default ShiftService
