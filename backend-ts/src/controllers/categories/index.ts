import { CategoriesService } from '#/services/categories'
import { IRequestHandler } from '#/types/common'
import { getPagination } from '#/utils'

export class CategoriesController {
  async create(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const warehouseId = req.headers['x-warehouse']
      const vendorId = req.headers['x-vendor']
      const params = {
        ...req.body,
        vendorId: vendorId
      }
      const resp = await new CategoriesService().create(params)
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
      const vendorId = req.activeVendorId
      const resp = await new CategoriesService().update(req.body, Number(vendorId))
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
      const { id } = req.params
      const vendorId = req.activeVendorId
      if (!id) throw new Error('id is required')
      const resp = await new CategoriesService().deleteById(Number(id), Number(vendorId))
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
      const warehouseId = req.headers['x-warehouse']
      const vendorId = req.headers['x-vendor'] as string
      const { limit, offset } = getPagination(req.query)
      const { count, rows } = await new CategoriesService().getCategories({ limit, offset, vendorId })
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getById(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const { id } = req.params
      const vendorId = req.activeVendorId
      if (!id) throw new Error('id is required')
      const resp = await new CategoriesService().getById(Number(id), Number(vendorId))
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
