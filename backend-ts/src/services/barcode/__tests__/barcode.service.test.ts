import Inventory from '#/database/models/inventory'
import ProductBarcode from '#/database/models/productBarcode'
import BarcodeService from '..'
import database from '#/database'
import { describe, expect, it, vi } from 'vitest'

const barcode = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  variantId: 7,
  barcode: '893000000001',
  conversionRate: 1,
  retailPrice: '100',
  wholesalePrice: '80',
  promoPrice: '70',
  promoStartAt: new Date(Date.now() - 60_000),
  promoEndAt: new Date(Date.now() + 60_000),
  ...overrides
})

describe('BarcodeService', () => {
  it('applies wholesale, then active promotion, then retail and formats all unit levels', async () => {
    ProductBarcode.findOne = vi.fn().mockResolvedValue(barcode()) as any
    ProductBarcode.findAll = vi.fn().mockResolvedValue([
      { conversionRate: 24, unit: { name: 'thùng' } },
      { conversionRate: 6, unit: { name: 'lốc' } },
      { conversionRate: 1, unit: { name: 'chai' } }
    ]) as any
    Inventory.findAll = vi.fn().mockResolvedValue([{ quantity: 53 }]) as any
    const service = new BarcodeService()

    await expect(service.scanBarcode('893000000001', 'wholesale', 1)).resolves.toMatchObject({
      appliedPrice: 80,
      stock: { display: '2 thùng 5 chai' }
    })
    await expect(service.scanBarcode('893000000001', 'retail', 1)).resolves.toMatchObject({ appliedPrice: 70 })

    ProductBarcode.findOne = vi.fn().mockResolvedValue(barcode({ promoEndAt: new Date(Date.now() - 1) })) as any
    await expect(service.scanBarcode('893000000001', 'retail', 1)).resolves.toMatchObject({ appliedPrice: 100 })
  })

  it('allows only one simultaneous deduction when both sales consume the same stock', async () => {
    const transaction = { LOCK: { UPDATE: 'UPDATE' } }
    database.sequelize.transaction = vi.fn(async (callback: any) => callback(transaction)) as any
    ProductBarcode.findOne = vi.fn().mockResolvedValue(barcode({ conversionRate: 6 })) as any
    let remaining = 6
    Inventory.decrement = vi.fn(async (_field, options) => {
      const requested = options.by
      if (remaining < requested) return [undefined, 0]
      remaining -= requested
      return [undefined, 1]
    }) as any
    const service = new BarcodeService()

    const outcomes = await Promise.allSettled([
      service.deductInventory(7, 10, 1, 1),
      service.deductInventory(7, 10, 1, 1)
    ])

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1)
    expect(remaining).toBe(0)
  })

  it('serializes conversion rate from the barcode', async () => {
    ProductBarcode.findOne = vi.fn().mockResolvedValue(barcode({ conversionRate: 6 })) as any
    ProductBarcode.findAll = vi.fn().mockResolvedValue([{ conversionRate: 6, unit: { name: 'pack' } }]) as any
    Inventory.findAll = vi.fn().mockResolvedValue([{ quantity: 6 }]) as any
    await expect(new BarcodeService().scanBarcode('893000000001', 'retail', 1)).resolves.toMatchObject({
      barcode: { conversionRate: 6 }
    })
  })
})
