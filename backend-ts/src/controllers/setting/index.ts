import { SettingService } from '#/services/setting'
import { IRequestHandler, IRequestLocal } from '#/types/common'

export class SettingController {
  async get(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const data = await new SettingService().get(req as IRequestLocal)
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
