import OrderService from '#/services/order'
import { InvoiceService } from '#/services/invoice'
import { getRequestedWarehouseId } from '#/utils/tenant'
import { NextFunction, Request, Response } from 'express'
export default class OrderController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const warehouseId = req.headers['x-warehouse']
      const vendorId = req.headers['x-vendor'] as string

      const order = await new OrderService().create({ ...req.body, vendorId, warehouseId }, (req as any).tenant.scope)
      return res.status(200).json({
        data: order
      })
    } catch (error) {
      next(error)
    }
  }
  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Orders']
      const warehouseId = req.headers['x-warehouse'] as string
      const vendorId = req.headers['x-vendor'] as string
      const vendorScope = (req as any).tenant.scope
      const { count, rows } = await new OrderService().getOrders({ ...req.query, warehouseId, vendorId }, vendorScope)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const warehouseId = getRequestedWarehouseId(req as any)
      const resp = await new OrderService().getOrderById(
        { warehouseId: warehouseId as string, id },
        (req as any).tenant.scope
      )
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Orders']

      const resp = await new OrderService().update(req as any)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
  async createOrderInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Orders']
      // #swagger.summary = 'Create invoice from order lines (partial allowed)'
      const orderId = Number(req.params.id)
      if (!orderId) throw new Error('order id is required')
      const { lines, paymentType, notes, dueDate } = req.body as any
      const scope = (req as any).tenant.scope
      const invoice = await new InvoiceService().createFromOrderLines(
        orderId,
        lines,
        {
          paymentType,
          notes,
          dueDate
        },
        scope
      )
      res.status(201).json({ data: invoice })
      return
    } catch (error) {
      next(error)
    }
  }
  async returnOrder(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Orders']
      // #swagger.summary = 'Return (part of) a sale order'
      const resp = await new OrderService().returnOrder(req as any)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
}
