import { InvoiceService } from '#/services/invoice'
import { IRequestLocal } from '#/types/common'
import { Request, Response, NextFunction } from 'express'

export class InvoiceController {
  /**
   * Get all invoices
   */
  async getInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const { count, rows } = await new InvoiceService().getInvoices(req as IRequestLocal)
      res.status(200).json({
        total: count,
        data: rows
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await new InvoiceService().getInvoiceById(req as IRequestLocal)
      res.status(200).json({
        data: invoice
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Create new invoice
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await new InvoiceService().create(req as IRequestLocal)
      res.status(201).json({
        data: invoice,
        message: 'Invoice created successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Update invoice
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await new InvoiceService().update(req as IRequestLocal)
      res.status(200).json({
        data: invoice,
        message: 'Invoice updated successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Delete invoice
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await new InvoiceService().delete(req as IRequestLocal)
      res.status(200).json({
        data: result,
        message: 'Invoice deleted successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Update invoice status
   */
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await new InvoiceService().updateStatus(req as IRequestLocal)
      res.status(200).json({
        data: invoice,
        message: 'Invoice status updated successfully'
      })
    } catch (error) {
      next(error)
    }
  }
}
