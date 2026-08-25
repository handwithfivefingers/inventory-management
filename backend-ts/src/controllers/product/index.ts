// const { ProductService } = require('../../services')

import { ProductService } from '#/services/product'
import { IRequestLocal } from '#/types/common'
import { Request, Response, NextFunction } from 'express'
export class ProductController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
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
      const { count, rows } = await new ProductService().getProducts(req as IRequestLocal)
      console.log('rows', count)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      next(error)
    }
  }
  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new ProductService().getProductById(req as IRequestLocal)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
  // async updateProduct(req: Request, res: Response, next: NextFunction) {
  //   try {
  //     const resp = await new ProductService().updateProduct(req)
  //     return res.status(200).json({
  //       data: resp
  //     })
  //   } catch (error) {
  //     next(error)
  //   }
  // }

  async getProductVariants(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new ProductService().getProductVariants(req as IRequestLocal)
      res.status(200).json({ total: resp.count, data: resp.rows })
      return
    } catch (error) {
      next(error)
    }
  }

  async updateVariant(req: Request, res: Response, next: NextFunction) {
    try {
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
      const resp = await new ProductService().syncProductVariants(req as IRequestLocal)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }

  async getProductAttributes(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new ProductService().getProductAttributes(req as IRequestLocal)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }

  async listAttributes(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new ProductService().listAttributes(req as IRequestLocal)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }

  async createAttribute(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new ProductService().createAttribute(req as IRequestLocal)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }

  async updateAttribute(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new ProductService().updateAttribute(req as IRequestLocal)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }

  async deleteAttribute(req: Request, res: Response, next: NextFunction) {
    try {
      const resp = await new ProductService().deleteAttribute(req as IRequestLocal)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
}
