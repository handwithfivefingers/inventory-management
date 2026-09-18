import { ApiError } from '#/response'
import { TagsService } from '#/services/tags'
import { IRequestHandler } from '#/types/common'
export class TagsController {
  async create(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const vendorId = req.activeVendorId
      const resp = await new TagsService().create({ ...req.body, vendorId })
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
      const id = req.params.id
      if (!id) throw ApiError.from(new Error('Tag not found'))
      const vendorId = req.activeVendorId
      const resp = await new TagsService().update({ ...req.body, id, vendorId })
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
      const warehouseId = req.headers['x-warehouse']
      const vendorId = req.activeVendorId
      const { count, rows } = await new TagsService().getTags({ vendorId: vendorId as string })
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getById(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const vendorId = req.activeVendorId as string
      const resp = await new TagsService().getById({ id: req.params.id, vendorId })
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      console.warn('error', error)
      next(error)
    }
  }
  async delete(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const { id } = req.params
      const vendorId = req.activeVendorId
      if (!id) throw new Error('id is required')
      const resp = await new TagsService().delete(Number(id), Number(vendorId))
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }
}
