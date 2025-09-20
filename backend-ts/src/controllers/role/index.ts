const { RoleService } = require('@api/services')
import { IRequestHandler } from '#/types/common'
export default class RoleController {
  async create(...[req, res, next]: IRequestHandler) {
    try {
      const resp = await new RoleService().create(req, res, next)
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }
  async get(...[req, res, next]: IRequestHandler) {
    try {
      const resp = await new RoleService().getRoles(req, res, next)
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }
}
