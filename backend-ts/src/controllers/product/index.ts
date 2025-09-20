// const { ProductService } = require('../../services')

import { ProductService } from '#/services/product'
import { IRequestLocal } from '#/types/common'
import { Request, Response, NextFunction } from 'express'
export class ProductController {
  // async create(req: Request, res: Response, next: NextFunction) {
  //   try {
  //     const resp = await new ProductService().create(req)
  //     return res.status(200).json({
  //       data: resp
  //     })
  //   } catch (error) {
  //     next(error)
  //   }
  // }
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
}
