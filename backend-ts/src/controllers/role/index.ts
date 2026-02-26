import { RoleService } from '#/services/role'
import { IRequestHandler } from '#/types/common'
import { RoleModel } from '#/types/role'
import { Request, Response, NextFunction } from 'express'

class RoleController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new RoleService().create(req, res, next)
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      // Get vendorId from query or user context
      const { vendorId } = req.query
      const userVendorId = (req as any).user?.vendorId
      
      const resp = await new RoleService().getRoles(vendorId ? Number(vendorId) : userVendorId)
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const resp = await new RoleService().getRoleById(Number(id))
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new RoleService().update(req, res, next)
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new RoleService().delete(req, res, next)
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }

  async assignToUser(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new RoleService().assignToUser(req, res, next)
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }
}
export { RoleController }
