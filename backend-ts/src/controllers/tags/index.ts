import { IRequestHandler } from '#/types/common'
export class TagsController {
  async create(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const resp = await new TagsService().create(req.body)
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }
  async update(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const resp = await new TagsService().update(req)
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }
  async get(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const { count, rows } = await new TagsService().getTags(req.query)
      return res.status(200).json({ total: count, data: rows })
    } catch (error) {
      next(error)
    }
  }
  async getById(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const resp = await new TagsService().getById({ params: req.params, query: req.query })
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      console.warn('error', error)
      next(error)
    }
  }
}
