import { FinancialService } from '#/services/financial'
import { IRequestHandler } from '#/types/common'
import { getPagination } from '#/utils'
import { getRequestedWarehouseId } from '#/utils/tenant'
import { NextFunction, Request, Response } from 'express'

export class FinancialController {
  async get(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      // #swagger.tags = ['Financial']
      const { limit, offset } = getPagination((req as any).query)
      const warehouseId = getRequestedWarehouseId(req as any)
      const { count, rows } = await new FinancialService().getFinancial({
        limit,
        offset,
        warehouseId
      })
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }

  async getVouchers(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Financial']
      const { limit, offset } = getPagination((req as any).query)
      const { type, category, from, to } = req.query as any
      const warehouseId = getRequestedWarehouseId(req as any)
      const { count, rows } = await new FinancialService().getVouchers({
        limit,
        offset,
        warehouseId,
        type,
        category,
        from,
        to
      })
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }

  async getVoucherById(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Financial']

      const { id } = req.params
      const resp = await new FinancialService().getVoucherById(id)
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }

  async createVoucher(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Financial']

      const resp = await new FinancialService().createVoucher(req.body)
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }

  async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Financial']

      const { from, to } = req.query
      const warehouseId = getRequestedWarehouseId(req as any)
      const vendorScope = (req as any).tenant.scope
      const resp = await new FinancialService().getReport(
        {
          from: from as string,
          to: to as string,
          warehouseId: warehouseId as string
        },
        vendorScope
      )
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
}
