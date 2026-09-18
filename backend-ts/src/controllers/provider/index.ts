import { ProviderService } from '#/services/provider'
import { IRequestHandler, IRequestLocal } from '#/types/common'
import { getRequestedVendorId } from '#/utils/tenant'
export class ProviderController {
  async create(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const params = {
        ...req.body,
        vendorId: req.activeVendorId
      }
      const resp = await new ProviderService().create(params)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
  async getProvider(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const { limit = 10, offset = 0 } = req.query
      const vendorId = req.activeVendorId
      const { count, rows } = await new ProviderService().getProvider({
        limit: Number(limit),
        offset: Number(offset),
        vendorId: Number(vendorId)
      })
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      console.log('getProvider error', error)
      next(error)
    }
  }
  async getId(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const vendorId = req.activeVendorId as number
      const resp = await new ProviderService().getProviderById({ id: req.params.id, vendorId })
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
      const resp = await new ProviderService().update(Number(id), req.body)
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }
}
