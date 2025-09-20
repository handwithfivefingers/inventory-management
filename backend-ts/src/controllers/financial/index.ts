import { IRequestHandler } from "#/types/common"

// const { FinancialService } = require('@src/api/services')
export class FinancialController {
  async get(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const { count, rows } = await new FinancialService().getFinancial(req)
      return res.status(200).json({ total: count, data: rows })
    } catch (error) {
      next(error)
    }
  }
  async getOrderById(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const resp = await new FinancialService().getOrderById({ params: req.params, query: req.query })
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }
}
