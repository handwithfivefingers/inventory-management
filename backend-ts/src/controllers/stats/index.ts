import { StatsService } from '#/services/stats'
import { NextFunction, Request, Response } from 'express'

export class StatsController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { days, from, to, groupBy, lowStockThreshold } = req.query
      const warehouseId = req.headers['x-warehouse']
      const vendorId = req.headers['x-vendor']

      const resp = await new StatsService().getDashboard({
        days: days as string,
        from: from as string,
        to: to as string,
        groupBy: groupBy as string,
        warehouseId: warehouseId as string,
        lowStockThreshold: lowStockThreshold as string,
        // S1: revenue/orders are scoped to the caller's vendors.
        vendorScope: (req as any).tenant.scope
      })
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
}
