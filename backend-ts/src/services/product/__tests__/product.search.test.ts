import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => {
  const makeModelMock = () => ({ findOne: vi.fn(), findAll: vi.fn(), findAndCountAll: vi.fn() })
  return {
    product: makeModelMock(),
    productVariant: makeModelMock(),
    inventory: makeModelMock(),
    warehouse: { findByPk: vi.fn() },
    sequelize: { literal: vi.fn((v: string) => v) }
  }
})

vi.mock('#/database', () => ({ default: db }))
vi.mock('#/database/models/product', () => ({ default: db.product, Product: db.product }))
vi.mock('#/database/models/productVariant', () => ({ default: db.productVariant, ProductVariant: db.productVariant }))
vi.mock('#/database/models/inventory', () => ({ default: db.inventory, Inventory: db.inventory }))
vi.mock('#/database/models/productAttribute', () => ({ default: {}, ProductAttribute: {} }))
vi.mock('#/database/models/productAttributeValue', () => ({ default: {}, ProductAttributeValue: {} }))
vi.mock('#/utils/entity-cache', () => ({
  getCachedEntity: vi.fn((_m: string, _i: unknown, loader: () => Promise<unknown>) => loader()),
  setCachedEntity: vi.fn(),
  evictCachedEntity: vi.fn()
}))

import { getCachedEntity } from '#/utils/entity-cache'
import { searchProducts } from '../product-search.service'

const makeVariant = (overrides: Record<string, any> = {}) => {
  const fields = {
    id: 11,
    productId: 5,
    skuCode: 'ABC-123',
    code: 'BARCODE-001',
    salePrice: 150,
    costPrice: 90,
    regularPrice: 200,
    isActive: true,
    VAT: 8,
    imageUrl: '/variant.png',
    isNegative: true,
    sold: 12,
    product: { id: 5, name: 'Ao thun', vendorId: 1, get: (k: string) => ({ id: 5, name: 'Ao thun', vendorId: 1 })[k] },
    inventories: [],
    ...overrides
  }
  return { ...fields, get: (k: string) => (fields as any)[k] }
}

beforeEach(() => {
  vi.clearAllMocks()
  db.warehouse.findByPk.mockResolvedValue({ vendorId: 1 })
})

describe('unified product search', () => {
  it('Branch 1: exact SKU scan match for POS returns a single item with exact_match', async () => {
    db.productVariant.findOne.mockResolvedValue(makeVariant())
    db.inventory.findOne.mockResolvedValue({ get: (k: string) => (k === 'quantity' ? 8 : null) })

    const result = await searchProducts({ query: 'ABC-123', context: 'POS', warehouse_id: 2 }, [1])

    expect(result.exact_match).toBe(true)
    expect(result.context).toBe('POS')
    if (result.exact_match) {
      expect(result.data).toMatchObject({ variant_id: 11, product_id: 5, sku: 'ABC-123', stock_quantity: 8, price: 150, costPrice: 90, VAT: 8, imageUrl: '/variant.png', isNegative: true, sold: 12 })
    }
    // Exact lookup hits barcode or SKU (case variants covered)
    const orFilter = db.productVariant.findOne.mock.calls[0][0].where
    expect(orFilter.isActive).toBe(true)
  })

  it('Branch 1: matches lowercase scans against uppercased SKUs', async () => {
    db.productVariant.findOne.mockResolvedValue(makeVariant())
    db.inventory.findOne.mockResolvedValue({ get: () => 1 })

    const result = await searchProducts({ query: 'abc-123', context: 'POS', warehouse_id: 2 }, [1])

    expect(result.exact_match).toBe(true)
    const where = db.productVariant.findOne.mock.calls[0][0].where
    const orKey = Object.getOwnPropertySymbols(where).find((s) => String(s).includes('or'))
    expect(JSON.stringify(where[orKey as any])).toContain('ABC-123')
  })

  it('Branch 1: Admin exact match sums stock across warehouses when no warehouse filter', async () => {
    db.productVariant.findOne.mockResolvedValue(makeVariant())
    db.inventory.findAll.mockResolvedValue([{ get: () => 3 }, { get: () => 4 }])

    const result = await searchProducts({ query: 'ABC-123', context: 'ADMIN' }, [1])

    expect(result.exact_match).toBe(true)
    if (result.exact_match) expect(result.data.stock_quantity).toBe(7)
  })

  it('Branch 2 POS: variant-level fallback never touches the entity cache', async () => {
    db.productVariant.findOne.mockResolvedValue(null)
    db.productVariant.findAndCountAll.mockResolvedValue({
      rows: [makeVariant({ inventories: [{ get: (k: string) => (k === 'quantity' ? 2 : 1) }] })],
      count: 1
    })

    const result = await searchProducts({ query: 'ao', context: 'POS', warehouse_id: 2, page: 1, limit: 20 }, [1])

    expect(result.exact_match).toBe(false)
    expect(result.context).toBe('POS')
    if (!result.exact_match) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({ display_name: 'Ao thun - ABC-123', stock_quantity: 2 })
    }
    expect(vi.mocked(getCachedEntity)).not.toHaveBeenCalled()
  })

  it('Branch 2 ADMIN: product-level fallback returns aggregates + total_count', async () => {
    db.productVariant.findOne.mockResolvedValue(null)
    db.productVariant.findAll.mockResolvedValue([{ productId: 5 }])
    const productRow: any = {
      get: (k: string) => ({ id: 5, name: 'Ao thun', variantCount: 3, quantity: 25, categories: [] })[k]
    }
    db.product.findAndCountAll.mockResolvedValue({ rows: [productRow], count: 42 })

    const result = await searchProducts({ query: 'ao', context: 'ADMIN', page: 2, limit: 10 }, [1])

    expect(result.exact_match).toBe(false)
    expect(result.context).toBe('ADMIN')
    if (!result.exact_match) {
      expect(result.total_count).toBe(42)
      expect(result.page).toBe(2)
      expect(result.data[0]).toMatchObject({ product_id: 5, total_variants: 3, total_stock: 25 })
    }
  })

  it('requires warehouse_id for POS context', async () => {
    await expect(searchProducts({ query: '', context: 'POS' }, [1])).rejects.toThrowError(
      'warehouse_id is required when context is POS'
    )
  })

  it('rejects unknown contexts', async () => {
    await expect(searchProducts({ query: '', context: 'WEB', warehouse_id: 1 } as any, [1])).rejects.toThrowError(
      'context must be POS or ADMIN'
    )
  })

  it('rejects cross-vendor warehouse access', async () => {
    db.warehouse.findByPk.mockResolvedValue({ vendorId: 9 })
    await expect(searchProducts({ query: '', context: 'POS', warehouse_id: 7 }, [1])).rejects.toThrowError()
  })
})
