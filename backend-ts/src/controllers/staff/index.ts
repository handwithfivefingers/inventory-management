import StaffService from '#/services/staff'
import { NextFunction, Request, Response } from 'express'

export default class StaffController {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { count, rows } = await new StaffService().getStaffs(req)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const resp = await new StaffService().getById(id)
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new StaffService().create(req.body)
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const resp = await new StaffService().update(Number(id), req.body)
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      await new StaffService().remove(Number(id))
      res.status(200).json({ success: true })
      return
    } catch (error) {
      next(error)
    }
  }
}
