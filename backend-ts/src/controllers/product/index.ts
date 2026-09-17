// const { ProductService } = require('../../services')

import { ProductService } from '#/services/product'
import { IRequestLocal } from '#/types/common'
import multer from 'multer'
import { Request, Response, NextFunction } from 'express'
import { getRequestedVendorId, getRequestedWarehouseId, getVendorScope } from '#/utils/tenant'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

/**
 * Multer middleware for the Excel import: exposes the file on req.file.
 * Exported so the router can reference the exact instance.
 */
export const productImportUpload = upload.single('file')

export class ProductController {
  async exportExcel(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      // #swagger.summary = 'Export products as xlsx'
      const { buffer, filename } = await new ProductService().exportExcel(req as IRequestLocal)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.status(200).send(buffer)
      return
    } catch (error) {
      next(error)
    }
  }

  async importTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      // #swagger.summary = 'Download the product import template (xlsx)'
      const buffer = await new ProductService().importTemplateExcel()
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename="product-import-template.xlsx"')
      res.status(200).send(buffer)
      return
    } catch (error) {
      next(error)
    }
  }

  async importExcel(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      // #swagger.summary = 'Import products from an xlsx/csv file (create + update by skuCode)'
      const report = await new ProductService().importExcel(req as any)
      res.status(200).json({ data: report })
      return
    } catch (error) {
      next(error)
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      const scope = getVendorScope(req)
      const vendorId = getRequestedVendorId(req as any)
      const warehouseId = getRequestedWarehouseId(req as any)
      const resp = await new ProductService().create({ ...req.body, warehouseId, vendorId }, scope)
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

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      // #swagger.summary = 'Unified product query for POS/Sell and Admin (exact scan match + context fallback)'
      const scope = getVendorScope(req)
      const vendorId = getRequestedVendorId(req as any)
      const headerWarehouseId = getRequestedWarehouseId(req as any)
      const result = await new ProductService().search(
        {
          query: req.body?.query ?? null,
          context: req.body?.context,
          warehouseId: headerWarehouseId ?? null,
          vendorId: vendorId ?? null,
          page: req.body?.page ?? 1,
          limit: req.body?.limit ?? 20
        },
        scope
      )
      if ((result as any).exact_match) {
        res.status(200).json({ exact_match: true, context: (result as any).context, data: (result as any).data })
        return
      }
      res.status(200).json({
        exact_match: false,
        context: (result as any).context,
        data: (result as any).data,
        total_count: (result as any).total_count,
        page: (result as any).page,
        limit: (result as any).limit
      })
      return
    } catch (error) {
      next(error)
    }
  }
  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      const scope = getVendorScope(req)
      const vendorId = getRequestedVendorId(req) as string
      const warehouseId = getRequestedWarehouseId(req) as string
      const resp = await new ProductService().getProductById({ id: req.params.id, warehouseId, vendorId }, scope)
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

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      const scope = getVendorScope(req)
      const vendorId = getRequestedVendorId(req as any)
      const warehouseId = getRequestedWarehouseId(req as any)
      const resp = await new ProductService().updateProduct(
        { id: req.params.id, ...req.body, warehouseId, vendorId },
        scope
      )
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      const resp = await new ProductService().deleteProduct(req as IRequestLocal)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }

  async restoreProduct(req: Request, res: Response, next: NextFunction) {
    try {
      // #swagger.tags = ['Products']
      const resp = await new ProductService().restoreProduct(req as IRequestLocal)
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
}
