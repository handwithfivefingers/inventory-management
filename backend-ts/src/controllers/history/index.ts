import { TransferService } from '#/services/transfer'
import { IRequestHandler, IRequestLocal } from '#/types/common'
export class HistoryController {
  async getHistoryByProductId(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const { count, rows } = await new TransferService().getHistoryByProductId(req as IRequestLocal)
      return res.status(200).json({ total: count, data: rows })
    } catch (error) {
      next(error)
    }
  }
}
