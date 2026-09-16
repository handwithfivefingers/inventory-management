import { UnitsService } from '#/services/units'
import { IRequestHandler, IRequestLocal } from '#/types/common'
import { getRequestedVendorId } from '#/utils/tenant'
export class UnitsController {
  async get(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const warehouseId = req.headers['x-warehouse']
      const vendorId = req.headers['x-vendor']
      const { count, rows } = await new UnitsService().getUnits(vendorId as string)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getById(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      if (!req.params.id) throw new Error('id is required')
      const { id } = req.params
      const vendor = getRequestedVendorId(req as IRequestLocal)
      console.log('req.params', req.params)
      const resp = await new UnitsService().getById({ vendor: vendor as string, id })
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      console.warn('error', error)
      next(error)
    }
  }
  async create(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const resp = await new UnitsService().create(req.body)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
  async update(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      if (!req.body.id) throw new Error('id is required')
      const resp = await new UnitsService().update(req.body)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
}
