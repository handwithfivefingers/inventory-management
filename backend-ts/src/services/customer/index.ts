import database from '#/database'
import { IRequestLocal } from '#/types/common'
import { ICustomerStatic } from '#/types/customer'
import { Sequelize } from 'sequelize'

export class CustomerService {
  customer: ICustomerStatic = database.customer
  sequelize: Sequelize = database.sequelize

  /**
   * Get all customers with pagination and filtering
   */
  async getCustomers(req: IRequestLocal) {
    const { page = 1, limit = 10, search, vendorId } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const where: any = {}

    // Filter by vendor
    if (vendorId) {
      where.vendorId = vendorId
    } else if (req.user?.vendorId) {
      // Auto-filter by user's vendor if not specified
      where.vendorId = req.user.vendorId
    }

    // Search by name, phone, or email
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ]
    }

    const { count, rows } = await this.customer.findAndCountAll({
      where,
      limit: Number(limit),
      offset: Number(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: database.vendor,
          attributes: ['id', 'name']
        }
      ]
    })

    return { count, rows }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(req: IRequestLocal) {
    const { id } = req.params

    const customer = await this.customer.findByPk(id, {
      include: [
        {
          model: database.vendor,
          attributes: ['id', 'name']
        },
        {
          model: database.invoice,
          attributes: ['id', 'invoiceNumber', 'total', 'status', 'createdAt'],
          order: [['createdAt', 'DESC']],
          limit: 10
        }
      ]
    })

    if (!customer) {
      throw new Error('Customer not found')
    }

    return customer
  }

  /**
   * Create new customer
   */
  async create(req: IRequestLocal) {
    const t = await this.sequelize.transaction()

    try {
      const { name, phone, email, address, taxCode, vendorId } = req.body

      // Validate required fields
      if (!name) {
        throw new Error('Customer name is required')
      }

      // Determine vendorId
      const finalVendorId = vendorId || req.user?.vendorId
      if (!finalVendorId) {
        throw new Error('vendorId is required')
      }

      const customer = await this.customer.create(
        {
          name,
          phone,
          email,
          address,
          taxCode,
          vendorId: finalVendorId
        },
        { transaction: t }
      )

      await t.commit()

      return customer
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  /**
   * Update customer
   */
  async update(req: IRequestLocal) {
    const t = await this.sequelize.transaction()

    try {
      const { id } = req.params
      const { name, phone, email, address, taxCode } = req.body

      const customer = await this.customer.findByPk(id)

      if (!customer) {
        throw new Error('Customer not found')
      }

      // Check vendor permission
      if (req.user?.vendorId && customer.vendorId !== req.user.vendorId) {
        throw new Error('Unauthorized to update this customer')
      }

      await customer.update(
        {
          name: name || customer.name,
          phone: phone ?? customer.phone,
          email: email ?? customer.email,
          address: address ?? customer.address,
          taxCode: taxCode ?? customer.taxCode
        },
        { transaction: t }
      )

      await t.commit()

      return customer
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  /**
   * Delete customer
   */
  async delete(req: IRequestLocal) {
    const t = await this.sequelize.transaction()

    try {
      const { id } = req.params

      const customer = await this.customer.findByPk(id)

      if (!customer) {
        throw new Error('Customer not found')
      }

      // Check vendor permission
      if (req.user?.vendorId && customer.vendorId !== req.user.vendorId) {
        throw new Error('Unauthorized to delete this customer')
      }

      // Check if customer has invoices
      const invoiceCount = await database.invoice.count({
        where: { customerId: id },
        transaction: t
      })

      if (invoiceCount > 0) {
        throw new Error('Cannot delete customer with existing invoices')
      }

      await customer.destroy({ transaction: t })

      await t.commit()

      return { message: 'Customer deleted successfully' }
    } catch (error) {
      await t.rollback()
      throw error
    }
  }
}

// Import Op at the top
import { Op } from 'sequelize'
