import { WarehouseService } from '#/services/warehouse'
import { IRequestHandler, IRequestLocal } from '#/types/common'
export class WarehouseController {
  async create(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const resp = await new WarehouseService().create(req.body)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
  async get(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const { count, rows } = await new WarehouseService().getWarehouse(req as IRequestLocal)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getWarehouseById(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const resp = await new WarehouseService().getWarehouseById({ params: req.params, query: req.query })
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
}
