import database from '#/database'
import { IOrderStatic } from '#/types/order'
import { IOrderDetailStatic } from '#/types/orderDetail'
import OrderService from '../order'
import { assertVendorAccess, assertWarehouseAccess, getVendorScope } from '#/utils/tenant'
import { Op, Sequelize } from 'sequelize'
import { getPagination } from '#/utils'
import Order from '#/database/models/order'
import Product from '#/database/models/product'

export class ImportOrderService {
  order: IOrderStatic = database.order
  orderDetail: IOrderDetailStatic = database.orderDetail
  sequelize: Sequelize = database.sequelize

  async getOrders(req: any) {
    try {
      const { offset, limit, warehouseId } = getPagination(req.query)
      // S1: validate the requested warehouse belongs to the caller's vendors.
      const scope = getVendorScope(req)
      if (warehouseId) await assertWarehouseAccess(warehouseId as string | number, scope)
      const where: any = { providerId: { [Op.ne]: null } }
      if (warehouseId) where.warehouseId = Number(warehouseId)
      else if (scope !== null && scope.length === 0) {
        // deny-all scope -> no rows
        return { count: 0, rows: [] }
      }
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

  async getById(
    { id }: { id: string | number },
    /** Multi-tenant scope from auth middleware (null = platform admin). */
    vendorScope: Parameters<typeof assertWarehouseAccess>[1] = null
  ) {
    try {
      const resp = await Order.findOne({
        where: { id, providerId: { [Op.ne]: null } } as any,
        include: [{ model: database.orderDetail, include: [Product] }, { model: database.provider }]
      })
      if (resp) {
        // S1: scoped callers may only read their own vendors' imports.
        assertVendorAccess(vendorScope, (resp as any).vendorId, 'Unauthorized to read this import order')
      }
      console.log('Import Order getById', resp)
      return resp
    } catch (error) {
      throw error
    }
  }

  async create(body: any, vendorScope: Parameters<typeof assertWarehouseAccess>[1] = null) {
    try {
      // Imports arrive from a provider -> type '0' (IN) so inventory increments
      return await new OrderService().create({ ...body, type: '0' }, vendorScope)
    } catch (error) {
      console.warn('importOrder create error', error)
      throw error
    }
  }
}

export default ImportOrderService
