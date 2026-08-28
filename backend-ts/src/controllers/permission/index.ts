import PermissionService from '#/services/permission'
import { NextFunction, Request, Response } from 'express'

export default class PermissionController {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new PermissionService().getPermissions()
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }
}
