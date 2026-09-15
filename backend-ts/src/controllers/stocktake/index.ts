import StocktakeService from '#/services/stocktake'
import { IRequestLocal } from '#/types/common'
import { NextFunction, Request, Response } from 'express'

export class StocktakeController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Stocktake']
      const { rows, count } = await new StocktakeService().list(req as IRequestLocal)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Stocktake']
      const data = await new StocktakeService().getById(req as IRequestLocal)
      res.status(200).json({ data })
      return
    } catch (error) {
      next(error)
    }
  }

  async start(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Stocktake']
      // #swagger.summary = 'Open a stocktake session (snapshots stock)'
      const data = await new StocktakeService().start(req as IRequestLocal)
      res.status(200).json({ data })
      return
    } catch (error) {
      next(error)
    }
  }

  async updateLines(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Stocktake']
      // #swagger.summary = 'Save counted quantities (lines: [{id, actualQuantity, note?}])'
      const data = await new StocktakeService().updateLines(req as IRequestLocal)
      res.status(200).json({ data })
      return
    } catch (error) {
      next(error)
    }
  }

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Stocktake']
      // #swagger.summary = 'Complete the session and apply stock variances'
      const data = await new StocktakeService().complete(req as IRequestLocal)
      res.status(200).json({ data })
      return
    } catch (error) {
      next(error)
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Stocktake']
      // #swagger.summary = 'Cancel an open stocktake session'
      const data = await new StocktakeService().cancel(req as IRequestLocal)
      res.status(200).json({ data })
      return
    } catch (error) {
      next(error)
    }
  }
}

export default StocktakeController
