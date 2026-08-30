import { WarehouseService } from '#/services/warehouse'
import { IRequestHandler } from '#/types/common'
import { getPagination } from '#/utils'
export class WarehouseController {
  async create(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const resp = await new WarehouseService().create(req.body)
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
      const { offset, limit, vendorId } = getPagination(req.query)
      const { count, rows } = await new WarehouseService().getWarehouse({ offset, limit, vendorId })
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getWarehouseById(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const { vendorId } = req.query
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
      const vendorId = (req.query.vendorId as string) || (req.body.vendorId as string) || (req as any).vendorId
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
