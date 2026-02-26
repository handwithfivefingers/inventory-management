import { CustomerService } from '#/services/customer'
import { IRequestLocal } from '#/types/common'
import { Request, Response, NextFunction } from 'express'

export class CustomerController {
  /**
   * Get all customers
   */
  async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const { count, rows } = await new CustomerService().getCustomers(req as IRequestLocal)
      res.status(200).json({
        total: count,
        data: rows
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await new CustomerService().getCustomerById(req as IRequestLocal)
      res.status(200).json({
        data: customer
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Create new customer
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await new CustomerService().create(req as IRequestLocal)
      res.status(201).json({
        data: customer,
        message: 'Customer created successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Update customer
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await new CustomerService().update(req as IRequestLocal)
      res.status(200).json({
        data: customer,
        message: 'Customer updated successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Delete customer
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await new CustomerService().delete(req as IRequestLocal)
      res.status(200).json({
        data: result,
        message: 'Customer deleted successfully'
      })
    } catch (error) {
      next(error)
    }
  }
}
