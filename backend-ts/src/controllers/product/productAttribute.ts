import { ProductAttributeServices } from '#/services/product/productAttribute'
import { IRequestLocal } from '#/types/common'
import { NextFunction, Request, Response } from 'express'

export class ProductAttributeController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { rows, count } = await new ProductAttributeServices().listAttributes(req as IRequestLocal)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await new ProductAttributeServices().getAttributeById(req as IRequestLocal)
      res.status(200).json({ data })
      return
    } catch (error) {
      next(error)
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await new ProductAttributeServices().createAttribute(req as IRequestLocal)
      res.status(200).json({ data })
      return
    } catch (error) {
      next(error)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await new ProductAttributeServices().updateAttribute(req as IRequestLocal)
      res.status(200).json({ data })
      return
    } catch (error) {
      next(error)
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await new ProductAttributeServices().deleteAttribute(req as IRequestLocal)
      res.status(200).json({ data })
      return
    } catch (error) {
      next(error)
    }
  }

  async createValues(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await new ProductAttributeServices().createAttributeValue(req as IRequestLocal)
      res.status(200).json({ data })
      return
    } catch (error) {
      next(error)
    }
  }

  async listValues(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await new ProductAttributeServices().getAttributeValues(req as IRequestLocal)
      res.status(200).json({ data })
      return
    } catch (error) {
      next(error)
    }
  }

  async updateValue(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await new ProductAttributeServices().updateAttributeValue(req as IRequestLocal)
      res.status(200).json({ data })
      return
    } catch (error) {
      next(error)
    }
  }

  async deleteValue(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await new ProductAttributeServices().deleteAttributeValue(req as IRequestLocal)
      res.status(200).json({ data })
      return
    } catch (error) {
      next(error)
    }
  }

  async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { rows, count } = await new ProductAttributeServices().getProductsByAttribute(req as IRequestLocal)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
}
