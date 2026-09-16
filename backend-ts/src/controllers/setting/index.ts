import { SettingService } from '#/services/setting'
import { IRequestHandler, IRequestLocal } from '#/types/common'

export class SettingController {
  async get(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const warehouseId = req.headers['x-warehouse']
      const vendorId = req.headers['x-vendor'] as string
      const userId = (req as IRequestLocal).user?.id || undefined
      const data = await new SettingService().get({ vendorId, userId })
      res.status(200).json({ data })
    } catch (error) {
      next(error)
    }
  }

  async update(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const data = await new SettingService().update(req as IRequestLocal, req.body)
      res.status(200).json({
        data,
        message: 'Settings updated successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  async getVendor(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const warehouseId = req.headers['x-warehouse']
      const vendorId = req.headers['x-vendor'] as string
      const data = await new SettingService().getVendorSettings(req as IRequestLocal, vendorId)
      res.status(200).json({ data })
    } catch (error) {
      next(error)
    }
  }

  async updateVendor(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const pathId = (req.params as any)?.id ?? null
      const data = await new SettingService().updateVendorSettings(req as IRequestLocal, req.body, pathId)
      res.status(200).json({
        data,
        message: 'Vendor settings updated successfully'
      })
    } catch (error) {
      next(error)
    }
  }
}
