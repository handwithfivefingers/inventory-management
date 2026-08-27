import { StatsService } from '#/services/stats'
import { getVendorScope } from '#/utils/tenant'
import { NextFunction, Request, Response } from 'express'

export class StatsController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { days, from, to, groupBy, warehouseId, lowStockThreshold } = req.query
      const resp = await new StatsService().getDashboard({
        days: days as string,
        from: from as string,
        to: to as string,
        groupBy: groupBy as string,
        warehouseId: warehouseId as string,
        lowStockThreshold: lowStockThreshold as string,
        // S1: revenue/orders are scoped to the caller's vendors.
        vendorScope: getVendorScope(req)
      })
      res.status(200).json({ data: resp })
      return
    } catch (error) {
      next(error)
    }
  }
}
