import OrderService from '#/services/order'
import { InvoiceService } from '#/services/invoice'
import { getVendorScope } from '#/utils/tenant'
import { NextFunction, Request, Response } from 'express'
export default class OrderController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Orders']
      const order = await new OrderService().create(req.body, getVendorScope(req as any))
      // Sales orders (no provider) auto-chain an invoice.
      // Cash/transfer -> paid + FinancialRecord, credit -> draft (no ledger yet)
      // let invoice: any = null
      // const isImport = (order as any).providerId != null
      // if (!isImport) {
      //   try {
      //     const scope = getVendorScope(req as any)
      //     const paymentType = (req.body.paymentType as string) || (order as any).paymentType || 'cash'
      //     // Delegate to InvoiceService.createAttempt via a synthetic IRequestLocal
      //     const invoiceReq: any = {
      //       body: {
      //         orderId: (order as any).id,
      //         paymentType,
      //         vendorId: (order as any).vendorId,
      //         warehouseId: (order as any).warehouseId,
      //         customerId: (order as any).customerId
      //       },
      //       locals: (req as any).locals,
      //       user: (req as any).user,
      //       query: {},
      //       params: {}
      //     }
      //     // Ensure vendor scope is propagated
      //     if (scope) invoiceReq.locals = { ...(invoiceReq.locals || {}), vendorIds: scope }
      //     invoice = await new InvoiceService().create(invoiceReq)
      //   } catch (invErr) {
      //     // Order is committed; invoice failure should not rollback order.
      //     // Return order with invoiceError for client to retry via manual flow.
      //     console.warn('auto-invoice after order failed', invErr)
      //   }
      // }
      res.status(200).json({
        data: {
          order
          // invoice,
          // invoiceError: invoice ? undefined : isImport ? undefined : 'auto-invoice failed or skipped'
        }
      })
      return
    } catch (error) {
      next(error)
    }
  }
  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Orders']

      const { count, rows } = await new OrderService().getOrders(req)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Orders']

      const { id } = req.params
      const { warehouseId } = req.query
      const resp = await new OrderService().getOrderById(
        { warehouseId: warehouseId as string, id },
        getVendorScope(req as any)
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
      const scope = getVendorScope(req as any)
      const invoice = await new InvoiceService().createFromOrderLines(
        orderId,
        lines,
        {
          paymentType,
          notes,
          dueDate,
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
