import { TagsService } from '#/services/tags'
import { IRequestHandler } from '#/types/common'
export class TagsController {
  async create(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const resp = await new TagsService().create(req.body)
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
      const resp = await new TagsService().update(req.body)
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
      if (!req.query.vendorId) throw new Error('vendorId is required')
      const { count, rows } = await new TagsService().getTags({ vendorId: req.query.vendorId as string })
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getById(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const resp = await new TagsService().getById({ id: req.params.id })
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
