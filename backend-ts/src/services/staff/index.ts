import database from '#/database'
import { IStaffStatic } from '#/types/staff'
import { getPagination } from '#/utils'
import { Op, Sequelize } from 'sequelize'

export class StaffService {
  staff: IStaffStatic = database.staff
  sequelize: Sequelize = database.sequelize

  async getStaffs(req: any) {
    try {
      const { offset, limit, warehouseId } = getPagination(req.query)
      const where: any = {}
      if (warehouseId) where.warehouseId = Number(warehouseId)
      if (req.query.status) where.status = req.query.status
      if (req.query.q) where.fullName = { [Op.like]: `%${req.query.q}%` }
      const resp = await this.staff.findAndCountAll({
        where,
        include: [{ model: database.user }, { model: database.warehouse }],
        offset: Number(offset),
        limit: Number(limit),
        distinct: true,
        order: [['createdAt', 'DESC']]
      })
      return resp
    } catch (error) {
      console.log('getStaffs error', error)
      throw error
    }
  }

  async getById(id: string | number) {
    try {
      return await this.staff.findByPk(id, {
        include: [{ model: database.user }, { model: database.warehouse }]
      })
    } catch (error) {
      throw error
    }
  }

  async create(body: any) {
    try {
      const count = await this.staff.count()
      const code = `NV-${String(count + 1).padStart(4, '0')}`
      return await this.staff.create({ ...body, code })
    } catch (error) {
      console.log('staff create error', error)
      throw error
    }
  }

  async update(id: number, body: any) {
    try {
      const [affectedRows] = await this.staff.update(body, { where: { id } })
      return affectedRows
    } catch (error) {
      throw error
    }
  }

  async remove(id: number) {
    try {
      return await this.staff.destroy({ where: { id } })
    } catch (error) {
      throw error
    }
  }
}

export default StaffService
