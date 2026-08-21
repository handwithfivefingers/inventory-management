import database from '#/database'
import { IOrderStatic } from '#/types/order'
import { IOrderDetailStatic } from '#/types/orderDetail'
import OrderService from '../order'
import { Op, Sequelize } from 'sequelize'
import { getPagination } from '#/utils'

export class ImportOrderService {
  order: IOrderStatic = database.order
  orderDetail: IOrderDetailStatic = database.orderDetail
  sequelize: Sequelize = database.sequelize

  async getOrders(req: any) {
    try {
      const { offset, limit, warehouseId } = getPagination(req.query)
      const where: any = { providerId: { [Op.ne]: null } }
      if (warehouseId) where.warehouseId = Number(warehouseId)
      if (req.query.providerId) where.providerId = Number(req.query.providerId)
      const resp = await this.order.findAndCountAll({
        where,
        include: [{ model: database.orderDetail }, { model: database.provider }],
        offset: Number(offset),
        limit: Number(limit),
        distinct: true,
        order: [['createdAt', 'DESC']]
      })
      return resp
    } catch (error) {
      console.warn('importOrder getOrders error', error)
      throw error
    }
  }

  async getById({ id }: { id: string | number }) {
    try {
      const resp = await this.order.findOne({
        where: { id, providerId: { [Op.ne]: null } } as any,
        include: [
          { model: database.orderDetail, include: database.product },
          { model: database.provider }
        ]
      })
      return resp
    } catch (error) {
      throw error
    }
  }

  async create(body: any) {
    try {
      // Imports arrive from a provider -> type '0' (IN) so inventory increments
      return await new OrderService().create({ ...body, type: '0' })
    } catch (error) {
      console.warn('importOrder create error', error)
      throw error
    }
  }
}

export default ImportOrderService
