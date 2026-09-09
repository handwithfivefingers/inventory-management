// const { ProductService } = require('../../services')

import { ProductService } from '#/services/product'
import { IRequestLocal } from '#/types/common'
import { Request, Response, NextFunction } from 'express'
export class ProductController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      const resp = await new ProductService().create(req as IRequestLocal)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
  // async importProduct(req: Request, res: Response, next: NextFunction) {
  //   try {
  //     const resp = await new ProductService().importProduct(req)
  //     return res.status(200).json({
  //       data: resp
  //     })
  //   } catch (error) {
  //     next(error)
  //   }
  // }
  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      const { count, rows } = await new ProductService().getProducts(req as IRequestLocal)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      const resp = await new ProductService().getProductById(req as IRequestLocal)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }

  async getProductVariants(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      const resp = await new ProductService().getProductVariants(req as IRequestLocal)
      res.status(200).json({ total: resp.count, data: resp.rows })
      return
    } catch (error) {
      next(error)
    }
  }

  async updateVariant(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      const resp = await new ProductService().updateVariant(req as IRequestLocal)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }

  async deleteVariant(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      const resp = await new ProductService().deleteVariant(req as IRequestLocal)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }

  async syncProductVariants(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      const resp = await new ProductService().syncProductVariants(req as IRequestLocal)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
}
