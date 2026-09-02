import { FinancialService } from '#/services/financial'
import { IRequestHandler, IRequestLocal } from '#/types/common'
import { getVendorScope } from '#/utils/tenant'
import { NextFunction, Request, Response } from 'express'

export class FinancialController {
  async get(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const { count, rows } = await new FinancialService().getFinancial(req as IRequestLocal)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }

  async getVouchers(req: Request, res: Response, next: NextFunction) {
    try {
      const { count, rows } = await new FinancialService().getVouchers(req)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }

  async getVoucherById(req: Request, res: Response, next: NextFunction) {
    try {
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
      const resp = await new FinancialService().createVoucher(req.body)
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }

  async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to, warehouseId } = req.query
      const vendorScope = getVendorScope(req as any)
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
