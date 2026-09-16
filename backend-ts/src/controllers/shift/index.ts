import ShiftService from '#/services/shift'
import { getRequestedWarehouseId } from '#/utils/tenant'
import { NextFunction, Request, Response } from 'express'

export default class ShiftController {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { count, rows } = await new ShiftService().getShifts(req)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getCurrent(req: Request, res: Response, next: NextFunction) {
    try {
      const warehouseId = getRequestedWarehouseId(req as any)
      const resp = await new ShiftService().getCurrent(warehouseId as string)
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const resp = await new ShiftService().getById(id)
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
  async open(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new ShiftService().open(req.body)
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
  async close(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const resp = await new ShiftService().close(Number(id), req.body)
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
}
