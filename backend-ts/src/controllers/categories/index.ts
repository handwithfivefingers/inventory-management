import { CategoriesService } from '#/services/categories'
import { IRequestHandler, IRequestLocal } from '#/types/common'

export class CategoriesController {
  async create(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const resp = await new CategoriesService().create(req.body)
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
      const resp = await new CategoriesService().update(req.body)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
  async delete(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      if (!req.query?.id) throw new Error('id is required')
      const resp = await new CategoriesService().deleteById(req.query.id as string)
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
      const { count, rows } = await new CategoriesService().getCategories(req as IRequestLocal)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getById(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      // const resp = await new CategoriesService().getById({ params: req.params, query: req.query })
      const resp = await new CategoriesService().getById(req.params.id)
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
