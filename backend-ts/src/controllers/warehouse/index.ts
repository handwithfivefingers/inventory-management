import { WarehouseService } from '#/services/warehouse'
import { IRequestHandler, IRequestLocal } from '#/types/common'
import { getPagination } from '#/utils'
import { getRequestedVendorId } from '#/utils/tenant'
export class WarehouseController {
  async transferStock(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      // #swagger.tags = ['Warehouses']
      // #swagger.summary = 'Transfer stock between two warehouses'
      const resp = await new WarehouseService().transferStock(req as IRequestLocal)
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
  async create(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      // Tenant guard: a warehouse created without a vendorId would be invisible
      // to vendor-scoped queries (transfers would 403 on it).
      // Active vendor comes from the `x-vendor` header (legacy query/body fallback).
      const body: any = { ...(req.body || {}) }
      if (!body.vendorId) body.vendorId = getRequestedVendorId(req as IRequestLocal)
      const resp = await new WarehouseService().create(body)
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
      const { offset, limit } = getPagination(req.query)
      const vendorId = getRequestedVendorId(req as IRequestLocal)
      const { count, rows } = await new WarehouseService().getWarehouse({ offset, limit, vendorId: vendorId as string })
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getWarehouseById(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const vendorId = getRequestedVendorId(req as IRequestLocal)
      const id = req.params.id as string
      if (!id) throw new Error('id is required')
      console.log('vendorId', vendorId)
      const resp = await new WarehouseService().getWarehouseById({ vendorId, id: +id })
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
      const id = req.params.id as string
      if (!id) throw new Error('id is required')
      const vendorId = getRequestedVendorId(req as IRequestLocal) || (req as any).vendorId
      const { name, email, address, phone, isMain } = req.body
      const resp = await new WarehouseService().update({
        id,
        vendorId: vendorId ? Number(vendorId) as any : undefined,
        name,
        email,
        address,
        phone,
        isMain
      } as any)
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
}
