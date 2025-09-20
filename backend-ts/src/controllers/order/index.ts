import OrderService from '#/services/order'
import { NextFunction, Request, Response } from 'express'
export default class OrderController {
  // async create(req, res, next) {
  //   try {
  //     const resp = await new OrderService().create(req.body)
  //     return res.status(200).json({
  //       data: resp
  //     })
  //   } catch (error) {
  //     next(error)
  //   }
  // }
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
  // async getOrderById(req, res, next) {
  //   try {
  //     const resp = await new OrderService().getOrderById({ params: req.params, query: req.query })
  //     return res.status(200).json({
  //       data: resp
  //     })
  //   } catch (error) {
  //     next(error)
  //   }
  // }
}
