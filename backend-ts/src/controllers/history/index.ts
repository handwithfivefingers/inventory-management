import { TransferService } from '#/services/transfer'
import { IRequestHandler } from '#/types/common'
export class HistoryController {
  async getHistoryByProductId(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const { id } = req.params
      const { warehouseId } = req.query
      if (!warehouseId) throw new Error('warehouseId is required')
      const { count, rows } = await new TransferService().getHistoryByProductId({
        id,
        warehouseId: warehouseId as string | string[]
      })
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
}
