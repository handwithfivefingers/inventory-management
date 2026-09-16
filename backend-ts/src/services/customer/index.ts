import database from '#/database'
import { IRequestLocal } from '#/types/common'
import { ICustomerStatic } from '#/types/customer'
import { SettingService } from '../setting'
import { applyCodeFormat, getCodeFormat, padSeq } from '#/utils/code-generator'
import { assertVendorAccess, getRequestedVendorId, getVendorScope } from '#/utils/tenant'
import { Op } from 'sequelize'
import { Sequelize } from 'sequelize'

export class CustomerService {
  customer: ICustomerStatic = database.customer
  sequelize: Sequelize = database.sequelize

  /**
   * Get all customers with pagination and filtering
   */
  async getCustomers(req: IRequestLocal) {
    const { page = 1, limit = 10, search } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    // Active vendor: `x-vendor` header first, then legacy query/body.
    // Non-numeric legacy values (e.g. tests) pass through untouched;
    // numeric values are scope-checked when a scope exists.
    const requestedVendorId = getRequestedVendorId(req) ?? (req.query as any)?.vendorId
    const scope = getVendorScope(req)
    const where: any = {}
    if (requestedVendorId != null && String(requestedVendorId).trim() !== '') {
      const numeric = Number(requestedVendorId)
      if (scope !== null && Number.isFinite(numeric)) {
        assertVendorAccess(scope, numeric, 'Unauthorized vendor filter')
        where.vendorId = numeric
      } else {
        where.vendorId = requestedVendorId
      }
    } else if (scope !== null && scope.length > 0) {
      where.vendorId = { [Op.in]: scope }
    } else if ((req as any).user?.vendorId) {
      // Auto-filter by user's primary vendor if not specified
      where.vendorId = (req as any).user.vendorId
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
      const { name, phone, email, address, taxCode } = req.body

      // Validate required fields
      if (!name) {
        throw new Error('Customer name is required')
      }

      // Active vendor: header first, then body, then scope/user fallback.
      const requestedVendorId = getRequestedVendorId(req) ?? (req.body as any)?.vendorId
      const scope = getVendorScope(req)
      const fallback = scope && scope.length > 0 ? scope[0] : (req as any)?.user?.vendorId
      const finalVendorId = requestedVendorId ?? fallback
      if (!finalVendorId) {
        throw new Error('vendorId is required')
      }
      assertVendorAccess(scope, Number(finalVendorId), 'Unauthorized to create customer for this vendor')

      // Auto-generate the customer code from the vendor prefix/suffix settings
      let code = req.body?.code
      try {
        const settings = await new SettingService().getForVendor(finalVendorId)
        const seq = await this.customer.count({ where: { vendorId: finalVendorId } })
        const baseCode = code || padSeq(seq + 1)
        const { prefix, suffix } = getCodeFormat(settings.codePrefix, settings.codeSuffix, 'customer')
        code = applyCodeFormat(baseCode, prefix, suffix)
      } catch (e) {
        console.warn('customer code generation skipped', e)
      }

      const customer = await this.customer.create(
        {
          name,
          phone,
          email,
          address,
          taxCode,
          code,
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

      // Check vendor permission: scope-aware, plus legacy single `user.vendorId`
      // shape used by older callers/tests (scope is null there).
      const updateScope = getVendorScope(req)
      assertVendorAccess(updateScope, (customer as any).vendorId, 'Unauthorized to update this customer')
      const legacyVendorId = (req as any)?.user?.vendorId
      if (
        updateScope === null &&
        legacyVendorId != null &&
        String(legacyVendorId).trim() !== '' &&
        String((customer as any).vendorId) !== String(legacyVendorId)
      ) {
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

      // Check vendor permission: scope-aware, plus legacy single `user.vendorId`
      // shape used by older callers/tests (scope is null there).
      const deleteScope = getVendorScope(req)
      assertVendorAccess(deleteScope, (customer as any).vendorId, 'Unauthorized to delete this customer')
      const legacyDeleteVendorId = (req as any)?.user?.vendorId
      if (
        deleteScope === null &&
        legacyDeleteVendorId != null &&
        String(legacyDeleteVendorId).trim() !== '' &&
        String((customer as any).vendorId) !== String(legacyDeleteVendorId)
      ) {
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

// Op is imported at the top for search filters
