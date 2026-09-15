import { SettingService } from '#/services/setting'
import { IRequestHandler, IRequestLocal } from '#/types/common'

export class SettingController {
  async get(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const vendorId = (req.query.vendorId as string) || undefined
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
}
