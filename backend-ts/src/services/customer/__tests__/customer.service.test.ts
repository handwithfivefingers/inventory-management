import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Op } from 'sequelize'

const db = vi.hoisted(() => {
  const MODEL_METHODS = [
    'findOne',
    'findAll',
    'findAndCountAll',
    'create',
    'build',
    'update',
    'destroy',
    'findByPk',
    'count',
    'bulkCreate'
  ]
  const makeModelMock = () => {
    const m: any = {}
    for (const method of MODEL_METHODS) m[method] = vi.fn()
    return m
  }
  const models = [
    'user',
    'role',
    'vendor',
    'warehouse',
    'product',
    'inventory',
    'transfer',
    'category',
    'tag',
    'unit',
    'permission',
    'customer',
    'provider',
    'staff',
    'shift',
    'order',
    'orderDetail',
    'invoice',
    'invoiceDetail',
    'financialRecord',
    'setting',
    'units'
  ]
  const database: any = {}
  for (const name of models) database[name] = makeModelMock()
  database.sequelize = {
    transaction: vi.fn(),
    literal: vi.fn((v: any) => v),
    col: vi.fn((v: any) => v),
    query: vi.fn(),
    fn: vi.fn((...a: any[]) => a)
  }
  return database
})

vi.mock('#/database', () => ({ default: db }))
import database from '#/database'
import { CustomerService } from '../index'

const makeTx = () => ({ commit: vi.fn(), rollback: vi.fn() })

describe('CustomerService', () => {
  let service: CustomerService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new CustomerService()
    database.sequelize.transaction.mockResolvedValue(makeTx())
  })

  describe('getCustomers', () => {
    it('returns count and rows filtered by query vendorId', async () => {
      const resp = { count: 2, rows: [{ id: 1 }, { id: 2 }] }
      database.customer.findAndCountAll.mockResolvedValue(resp)

      const result = await service.getCustomers({
        query: { page: 1, limit: 10, vendorId: 'v1' }
      } as any)

      expect(result).toEqual(resp)
      expect(database.customer.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { vendorId: 'v1' },
          limit: 10,
          offset: 0
        })
      )
    })

    it("auto-filters by the request user's vendorId when not specified", async () => {
      database.customer.findAndCountAll.mockResolvedValue({ count: 0, rows: [] })

      await service.getCustomers({
        query: {},
        user: { vendorId: 'v2' }
      } as any)

      const call = database.customer.findAndCountAll.mock.calls[0][0]
      expect((call.where as any).vendorId).toBe('v2')
    })

    it('applies a search filter across name, phone and email', async () => {
      database.customer.findAndCountAll.mockResolvedValue({ count: 0, rows: [] })

      await service.getCustomers({
        query: { search: 'abc' }
      } as any)

      const call = database.customer.findAndCountAll.mock.calls[0][0]
      expect((call.where as any)[Op.or]).toBeDefined()
    })

    it('rethrows when the query fails', async () => {
      database.customer.findAndCountAll.mockRejectedValue(new Error('db down'))

      await expect(service.getCustomers({ query: {} } as any)).rejects.toThrow('db down')
    })
  })

  describe('getCustomerById', () => {
    it('returns the customer found by id', async () => {
      const found = { id: 7, name: 'Acme' }
      database.customer.findByPk.mockResolvedValue(found)

      const result = await service.getCustomerById({ params: { id: 7 } } as any)

      expect(result).toBe(found)
      const options = database.customer.findByPk.mock.calls[0][1]
      const includeModels = (options.include as any[]).map((inc) => inc.model)
      expect(includeModels).toContain(database.vendor)
      expect(includeModels).toContain(database.invoice)
    })

    it('throws when the customer is not found', async () => {
      database.customer.findByPk.mockResolvedValue(null)

      await expect(service.getCustomerById({ params: { id: 99 } } as any)).rejects.toThrow('Customer not found')
    })

    it('rethrows when the query fails', async () => {
      database.customer.findByPk.mockRejectedValue(new Error('db down'))

      await expect(service.getCustomerById({ params: { id: 7 } } as any)).rejects.toThrow('db down')
    })
  })

  describe('create', () => {
    it('throws when name is missing', async () => {
      await expect(service.create({ body: {}, user: { vendorId: 'v1' } } as any)).rejects.toThrow(
        'Customer name is required'
      )
    })

    it('throws when vendorId cannot be resolved', async () => {
      await expect(service.create({ body: { name: 'Acme' } } as any)).rejects.toThrow('vendorId is required')
    })

    it('creates a customer within a transaction and commits', async () => {
      const tx = makeTx()
      database.sequelize.transaction.mockResolvedValue(tx)
      const created = { id: 1, name: 'Acme', vendorId: 'v1' }
      database.customer.create.mockResolvedValue(created)

      const result = await service.create({
        body: { name: 'Acme', vendorId: 'v1' }
      } as any)

      expect(result).toBe(created)
      expect(database.customer.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Acme', vendorId: 'v1' }), {
        transaction: tx
      })
      expect(tx.commit).toHaveBeenCalled()
      expect(tx.rollback).not.toHaveBeenCalled()
    })

    it("falls back to the request user's vendorId", async () => {
      database.customer.create.mockResolvedValue({ id: 1 })

      await service.create({
        body: { name: 'Acme' },
        user: { vendorId: 'v2' }
      } as any)

      const call = database.customer.create.mock.calls[0][0]
      expect(call.vendorId).toBe('v2')
    })

    it('rolls back when creation fails', async () => {
      const tx = makeTx()
      database.sequelize.transaction.mockResolvedValue(tx)
      database.customer.create.mockRejectedValue(new Error('db down'))

      await expect(service.create({ body: { name: 'Acme', vendorId: 'v1' } } as any)).rejects.toThrow('db down')
      expect(tx.rollback).toHaveBeenCalled()
      expect(tx.commit).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('throws when the customer is not found', async () => {
      database.customer.findByPk.mockResolvedValue(null)

      await expect(
        service.update({
          params: { id: 7 },
          body: { name: 'New' }
        } as any)
      ).rejects.toThrow('Customer not found')
    })

    it('throws when the user is not authorized for this vendor', async () => {
      database.customer.findByPk.mockResolvedValue({ id: 7, vendorId: 'v1', update: vi.fn() })

      await expect(
        service.update({
          params: { id: 7 },
          body: { name: 'New' },
          user: { vendorId: 'v2' }
        } as any)
      ).rejects.toThrow('Unauthorized to update this customer')
    })

    it('updates the customer and returns it', async () => {
      const customer = {
        id: 7,
        vendorId: 'v1',
        name: 'Old',
        phone: '1',
        email: 'e',
        address: 'a',
        taxCode: 't',
        update: vi.fn().mockResolvedValue(undefined)
      }
      database.customer.findByPk.mockResolvedValue(customer)

      const result = await service.update({
        params: { id: 7 },
        body: { name: 'New' },
        user: { vendorId: 'v1' }
      } as any)

      expect(result).toBe(customer)
      expect(customer.update).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New' }),
        expect.objectContaining({ transaction: expect.anything() })
      )
    })

    it('rolls back when update fails', async () => {
      const tx = makeTx()
      database.sequelize.transaction.mockResolvedValue(tx)
      const customer = {
        id: 7,
        vendorId: 'v1',
        update: vi.fn().mockRejectedValue(new Error('db down'))
      }
      database.customer.findByPk.mockResolvedValue(customer)

      await expect(
        service.update({
          params: { id: 7 },
          body: { name: 'New' },
          user: { vendorId: 'v1' }
        } as any)
      ).rejects.toThrow('db down')
      expect(tx.rollback).toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('throws when the customer is not found', async () => {
      database.customer.findByPk.mockResolvedValue(null)

      await expect(service.delete({ params: { id: 7 } } as any)).rejects.toThrow('Customer not found')
    })

    it('throws when the user is not authorized for this vendor', async () => {
      database.customer.findByPk.mockResolvedValue({ id: 7, vendorId: 'v1', destroy: vi.fn() })

      await expect(
        service.delete({
          params: { id: 7 },
          user: { vendorId: 'v2' }
        } as any)
      ).rejects.toThrow('Unauthorized to delete this customer')
    })

    it('throws when the customer has invoices', async () => {
      database.customer.findByPk.mockResolvedValue({
        id: 7,
        vendorId: 'v1',
        destroy: vi.fn()
      })
      database.invoice.count.mockResolvedValue(3)

      await expect(service.delete({ params: { id: 7 }, user: { vendorId: 'v1' } } as any)).rejects.toThrow(
        'Cannot delete customer with existing invoices'
      )
    })

    it('deletes the customer and commits', async () => {
      const tx = makeTx()
      database.sequelize.transaction.mockResolvedValue(tx)
      const customer = { id: 7, vendorId: 'v1', destroy: vi.fn().mockResolvedValue(undefined) }
      database.customer.findByPk.mockResolvedValue(customer)
      database.invoice.count.mockResolvedValue(0)

      const result = await service.delete({
        params: { id: 7 },
        user: { vendorId: 'v1' }
      } as any)

      expect(result).toEqual({ message: 'Customer deleted successfully' })
      expect(customer.destroy).toHaveBeenCalledWith({ transaction: tx })
      expect(tx.commit).toHaveBeenCalled()
    })

    it('rolls back when deletion fails', async () => {
      const tx = makeTx()
      database.sequelize.transaction.mockResolvedValue(tx)
      const customer = { id: 7, vendorId: 'v1', destroy: vi.fn().mockRejectedValue(new Error('db down')) }
      database.customer.findByPk.mockResolvedValue(customer)
      database.invoice.count.mockResolvedValue(0)

      await expect(service.delete({ params: { id: 7 }, user: { vendorId: 'v1' } } as any)).rejects.toThrow('db down')
      expect(tx.rollback).toHaveBeenCalled()
    })
  })
})
