import { RoleService } from '#/services/role'
import { getRequestedVendorId } from '#/utils/tenant'
import { NextFunction, Request, Response } from 'express'

class RoleController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new RoleService().create(req.body)
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      // Active vendor comes from the `x-vendor` header (legacy query fallback).
      const vendorId = getRequestedVendorId(req as any)
      const userVendorId = (req as any).user?.vendorId

      const resp = await new RoleService().getRoles(vendorId ? Number(vendorId) : userVendorId)
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      console.log('error', error)
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const vendorId = getRequestedVendorId(req as any)
      const resp = await new RoleService().getRoleById({ id: Number(id), vendorId: Number(vendorId) })
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const resp = await new RoleService().update({ ...req.body, id })
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const resp = await new RoleService().delete({ id: Number(id) })
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }

  async assignToUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, roleId, vendorId } = req.body
      const resp = await new RoleService().assignToUser({
        userId: Number(userId),
        roleId: Number(roleId),
        vendorId: vendorId != null ? Number(vendorId) : undefined
      })
      return res.status(200).json({
        data: resp
      })
    } catch (error) {
      next(error)
    }
  }
}
export { RoleController }
