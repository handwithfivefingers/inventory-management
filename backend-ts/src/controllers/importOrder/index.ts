import ImportOrderService from '#/services/importOrder'
import { getRequestedVendorId, getRequestedWarehouseId } from '#/utils/tenant'
import { NextFunction, Request, Response } from 'express'

export default class ImportOrderController {
  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['ImportOrders']
      const { count, rows } = await new ImportOrderService().getOrders(req)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['ImportOrders']
      const { id } = req.params
      const resp = await new ImportOrderService().getById({ id }, (req as any).tenant.scope)
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['ImportOrders']
      const warehouseId = getRequestedWarehouseId(req)
      const vendorId = getRequestedVendorId(req)
      const resp = await new ImportOrderService().create(
        {
          ...req.body,
          warehouseId,
          vendorId
        },
        (req as any).tenant.scope
      )
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
}
