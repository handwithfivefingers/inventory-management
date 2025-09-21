import { UnitsService } from '#/services/units'
import { IRequestHandler } from '#/types/common'
export class UnitsController {
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
  async get(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const vendorId = req.query.vendorId
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
      if(!req.params.id) throw new Error('id is required')
      const resp = await new UnitsService().getById(req.params.id)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      console.warn('error', error)
      next(error)
    }
  }
}
