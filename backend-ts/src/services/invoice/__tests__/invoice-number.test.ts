import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => {
  const MODEL_METHODS = ['findOne', 'findAll', 'findAndCountAll', 'create', 'build', 'update', 'destroy', 'findByPk', 'count', 'bulkCreate']
  const makeModelMock = () => {
    const m: any = {}
    for (const method of MODEL_METHODS) m[method] = vi.fn()
    return m
  }
  const models = ['invoice', 'invoiceDetail', 'vendor', 'warehouse', 'order', 'orderDetail', 'customer', 'product', 'financialRecord']
  const database: any = {}
  for (const name of models) database[name] = makeModelMock()
  database.sequelize = {
    transaction: vi.fn(),
    query: vi.fn(),
    literal: vi.fn((v: any) => v),
    col: vi.fn((v: any) => v),
    fn: vi.fn((...args: any[]) => args)
  }
  return database
})

vi.mock('#/database', () => ({ default: db }))

import {
  buildSequenceScopeKey,
  buildVendorCode,
  buildWarehouseTag,
  formatInvoiceNumber,
  generateInvoiceNumber
} from '../invoice-number.generator'

describe('invoice-number.generator (warehouse + vendor uniqueness)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds a readable vendor code with INV fallback', () => {
    expect(buildVendorCode('Acme Corp')).toBe('ACM')
    expect(buildVendorCode('ab')).toBe('AB')
    expect(buildVendorCode('')).toBe('INV')
    expect(buildVendorCode(null)).toBe('INV')
  })

  it('builds a stable warehouse tag that is unique per warehouse id', () => {
    expect(buildWarehouseTag(1)).toBe('W001')
    expect(buildWarehouseTag(12)).toBe('W012')
    expect(buildWarehouseTag(1)).not.toBe(buildWarehouseTag(2))
  })

  it('scopes the atomic counter per vendor AND warehouse', () => {
    expect(buildSequenceScopeKey(7, 1)).toBe('invoice:7:1')
    expect(buildSequenceScopeKey(7, 1)).not.toBe(buildSequenceScopeKey(7, 2))
    expect(buildSequenceScopeKey(7, 1)).not.toBe(buildSequenceScopeKey(8, 1))
  })

  it('formats numbers with vendor + warehouse + year so warehouses never collide', () => {
    const first = formatInvoiceNumber({ vendorCode: 'ACM', warehouseTag: 'W001', year: 2026, sequence: 1 })
    const second = formatInvoiceNumber({ vendorCode: 'ACM', warehouseTag: 'W002', year: 2026, sequence: 1 })
    expect(first).toBe('ACM-W001-2026-00001')
    expect(second).toBe('ACM-W002-2026-00001')
    expect(first).not.toBe(second)
  })

  it('generates numbers inside the given transaction with a per-warehouse scopeKey', async () => {
    const transaction = { commit: vi.fn(), rollback: vi.fn() }
    db.vendor.findByPk.mockResolvedValue({ name: 'Acme Corp' })
    db.invoice.findOne.mockResolvedValue(null)
    db.sequelize.query.mockImplementation(async (sql: string) => {
      if (String(sql).includes('LAST_INSERT_ID()')) return [[{ seq: 4 }], []]
      return [[], []]
    })

    const invoiceNumber = await generateInvoiceNumber({ vendorId: 7, warehouseId: 2, year: 2026, transaction })

    expect(invoiceNumber).toBe('ACM-W002-2026-00004')
    expect(db.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining('ON DUPLICATE KEY UPDATE'),
      expect.objectContaining({ replacements: expect.objectContaining({ scopeKey: 'invoice:7:2', year: 2026 }) })
    )
    // Seeding lookup is scoped to the same vendor + warehouse + prefix
    expect(db.invoice.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ vendorId: 7, warehouseId: 2 })
      })
    )
  })

  it('two vendors sharing the same 3-letter prefix still get distinct counters per warehouse', async () => {
    const makeTx = () => ({ commit: vi.fn(), rollback: vi.fn() })
    db.sequelize.transaction.mockImplementation(async () => makeTx())
    db.vendor.findByPk.mockImplementation(async (vendorId: number) => {
      if (Number(vendorId) === 7) return { name: 'Acme Corp' }
      return { name: 'Acme Ltd' }
    })
    db.invoice.findOne.mockResolvedValue(null)
    const seenScopeKeys: string[] = []
    db.sequelize.query.mockImplementation(async (sql: string, options: any) => {
      if (String(sql).includes('LAST_INSERT_ID()')) return [[{ seq: 1 }], []]
      seenScopeKeys.push(options?.replacements?.scopeKey)
      return [[], []]
    })

    const first = await generateInvoiceNumber({ vendorId: 7, warehouseId: 1, year: 2026 })
    const second = await generateInvoiceNumber({ vendorId: 8, warehouseId: 2, year: 2026 })

    // Same readable prefix (ACM) but different warehouses -> different strings, no duplicate error
    expect(first).toBe('ACM-W001-2026-00001')
    expect(second).toBe('ACM-W002-2026-00001')
    expect(first).not.toBe(second)
    expect(seenScopeKeys).toEqual(['invoice:7:1', 'invoice:8:2'])
  })
})
