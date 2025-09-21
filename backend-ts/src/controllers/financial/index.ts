import { FinancialService } from '#/services/financial'
import { IRequestHandler, IRequestLocal } from '#/types/common'

// const { FinancialService } = require('@src/api/services')
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
}
