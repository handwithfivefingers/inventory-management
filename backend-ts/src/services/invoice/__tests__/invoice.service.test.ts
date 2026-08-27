import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => {
  const MODEL_METHODS = ['findOne', 'findAll', 'findAndCountAll', 'create', 'build', 'update', 'destroy', 'findByPk', 'count', 'bulkCreate']
  const makeModelMock = () => {
    const m: any = {}
    for (const method of MODEL_METHODS) m[method] = vi.fn()
    return m
  }
  const models = ['user', 'role', 'vendor', 'warehouse', 'product', 'inventory', 'transfer', 'category', 'tag', 'unit', 'permission', 'customer', 'provider', 'staff', 'shift', 'order', 'orderDetail', 'invoice', 'invoiceDetail', 'financialRecord', 'setting', 'units', 'productVariant', 'productAttribute', 'productAttributeValue']
  const database: any = {}
  for (const name of models) database[name] = makeModelMock()
  database.sequelize = {
    transaction: vi.fn(async () => ({ commit: vi.fn(), rollback: vi.fn() })),
    query: vi.fn(),
    literal: vi.fn((v: any) => v),
    col: vi.fn((v: any) => v),
    fn: vi.fn()
  }
  return database
})

vi.mock('#/database', () => ({ default: db }))

import { InvoiceService } from '../index'
import { Op } from 'sequelize'

const makeTx = () => ({ commit: vi.fn(), rollback: vi.fn() })
const makeReq = (overrides: Record<string, unknown> = {}) =>
  ({
    params: {},
    query: {},
    body: {},
    locals: { id: 1, email: 'u@x.com' },
    ...overrides
  }) as any

describe('InvoiceService multi-tenant guards (S1)', () => {
  let service: InvoiceService

  beforeEach(() => {
    vi.clearAllMocks()
    db.sequelize.transaction.mockResolvedValue(makeTx())
    service = new InvoiceService()
  })

  it('getInvoiceById REJECTS foreign-vendor invoices even though req.user is unset', async () => {
    // The old dead check was `req.user?.vendorId && ...` - req.user never
    // existed so this read used to succeed (IDOR). Now scope is enforced.
    db.invoice.findByPk.mockResolvedValue({ id: 5, vendorId: 42 })

    await expect(
      service.getInvoiceById(makeReq({ params: { id: 5 }, locals: { vendorIds: [1, 2] } }))
    ).rejects.toThrow('Unauthorized to view this invoice')
  })

  it('getInvoiceById allows in-scope invoices', async () => {
    const invoice = { id: 5, vendorId: 2 }
    db.invoice.findByPk.mockResolvedValue(invoice)

    await expect(
      service.getInvoiceById(makeReq({ params: { id: 5 }, locals: { vendorIds: [2] } }))
    ).resolves.toBe(invoice)
  })

  it('update rejects foreign-vendor invoices', async () => {
    db.invoice.findByPk.mockResolvedValue({ id: 9, vendorId: 77 })

    await expect(
      service.update(makeReq({ params: { id: 9 }, body: {}, locals: { vendorIds: [1] } }))
    ).rejects.toThrow('Unauthorized to update this invoice')
  })

  it('delete rejects foreign-vendor invoices before touching rows', async () => {
    db.invoice.findByPk.mockResolvedValue({ id: 9, vendorId: 77, status: 'draft' })

    await expect(
      service.delete(makeReq({ params: { id: 9 }, locals: { vendorIds: [1] } }))
    ).rejects.toThrow('Unauthorized to delete this invoice')
    expect(db.invoice.findByPk.mock.results[0].value.destroy).toBeUndefined()
  })

  it('getInvoices scopes the list to the caller vendors when no filter given', async () => {
    db.invoice.findAndCountAll.mockResolvedValue({ count: 0, rows: [] })

    await service.getInvoices(makeReq({ query: {}, locals: { vendorIds: [3, 4] } }))

    const where = db.invoice.findAndCountAll.mock.calls[0][0].where
    expect(where.vendorId).toEqual({ [Op.in]: [3, 4] })
  })

  it('getInvoices rejects out-of-scope explicit vendor filters', async () => {
    await expect(
      service.getInvoices(makeReq({ query: { vendorId: '99' }, locals: { vendorIds: [3] } }))
    ).rejects.toThrow(/Unauthorized/)
  })
})

describe('InvoiceService.create (C1 + S1)', () => {
  let service: InvoiceService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new InvoiceService()
  })

  const setupHappyOrder = (vendorId: number | null) => {
    const order: any = {
      id: 10,
      vendorId,
      warehouseId: 1,
      VAT: 0,
      surcharge: 0,
      paymentType: 'cash',
      orderDetails: [
        { productId: 1, quantity: 1, price: 100 }
      ]
    }
    db.order.findByPk.mockResolvedValue(order)
    // No duplicate-invoice guard hit
    db.invoice.findOne.mockResolvedValue(null)
    // Atomic counter: INSERT ... then SELECT LAST_INSERT_ID
    let call = 0
    db.sequelize.query.mockImplementation(async (sql: string) => {
      call += String(sql).includes('LAST_INSERT_ID()') ? 1 : 0
      return [[{ seq: call }], []]
    })
    db.vendor.findByPk.mockResolvedValue({ name: 'Acme Corp' })
    db.invoice.findOne.mockResolvedValue(null)
    const createdInvoice: any = { id: 100 }
    db.invoice.create.mockResolvedValue(createdInvoice)
    db.invoiceDetail.create.mockResolvedValue({})
    db.invoice.findByPk.mockResolvedValue(createdInvoice)
    return order
  }

  it('generates the number from the atomic counter INSIDE the transaction', async () => {
    setupHappyOrder(7)

    await service.create(makeReq({ body: { orderId: 10 }, locals: { vendorIds: [7] } }))

    expect(db.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining('ON DUPLICATE KEY UPDATE seq = LAST_INSERT_ID(seq + 1)'),
      expect.objectContaining({
        replacements: { scopeKey: 'invoice:7', year: new Date().getFullYear(), initial: 1 },
        transaction: expect.objectContaining({ commit: expect.any(Function) })
      })
    )
    expect(db.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceNumber: `ACM-${new Date().getFullYear()}-00001`, vendorId: 7 }),
      expect.anything()
    )
  })

  it('rejects creation for out-of-scope vendors (S1)', async () => {
    setupHappyOrder(50)

    await expect(
      service.create(makeReq({ body: { orderId: 10 }, locals: { vendorIds: [7] } }))
    ).rejects.toThrow(/Unauthorized to create an invoice for this order/)
  })

  it('retries once on ER_DUP_ENTRY and succeeds with a fresh number', async () => {
    setupHappyOrder(7)

    let attempt = 0
    db.invoice.create.mockImplementation(async (payload: any) => {
      attempt += 1
      if (attempt === 1) {
        throw Object.assign(new Error('Duplicate entry'), { original: { code: 'ER_DUP_ENTRY' } })
      }
      return { id: 101, invoiceNumber: payload.invoiceNumber }
    })
    // The post-commit reload echoes the retried invoice
    db.invoice.findByPk.mockResolvedValue({ id: 101 })

    const result: any = await service.create(makeReq({ body: { orderId: 10 }, locals: { vendorIds: [7] } }))

    expect(attempt).toBe(2)
    expect(result.id).toBe(101)
  })
})
