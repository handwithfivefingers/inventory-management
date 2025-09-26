import OrderService from '#/services/order'
import { NextFunction, Request, Response } from 'express'
export default class OrderController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new OrderService().create(req.body)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { count, rows } = await new OrderService().getOrders(req)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      console.log('getOrders error', error)
      next(error)
    }
  }
  async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { warehouseId } = req.query
      const resp = await new OrderService().getOrderById({ warehouseId: warehouseId as string, id })
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
}
