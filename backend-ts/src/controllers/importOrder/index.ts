import ImportOrderService from '#/services/importOrder'
import { getVendorScope } from '#/utils/tenant'
import { NextFunction, Request, Response } from 'express'

export default class ImportOrderController {
  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { count, rows } = await new ImportOrderService().getOrders(req)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const resp = await new ImportOrderService().getById({ id }, getVendorScope(req as any))
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new ImportOrderService().create(req.body, getVendorScope(req as any))
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
}
