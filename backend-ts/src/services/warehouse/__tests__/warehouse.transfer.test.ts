import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Unit tests for WarehouseService.transferStock — cross-warehouse stock
 * movement. Verifies validation, tenant guards, the atomic guarded
 * decrement, destination upsert, the auditable Transfer row, and rollback.
 */

const db = vi.hoisted(() => {
  const MODEL_METHODS = ['findOne', 'findAll', 'findByPk', 'create', 'build', 'count']
  const mk = () => {
    const m: any = {}
    for (const k of MODEL_METHODS) m[k] = vi.fn()
    return m
  }
  return { sequelize: { transaction: vi.fn() }, warehouse: mk(), transfer: mk() }
})

const inventoryModel = vi.hoisted(() => ({ findOne: vi.fn(), decrement: vi.fn(), build: vi.fn() }))
const productModel = vi.hoisted(() => ({ findByPk: vi.fn() }))
const productVariantModel = vi.hoisted(() => ({ findByPk: vi.fn() }))
const transferModel = vi.hoisted(() => ({ build: vi.fn() }))
const warehouseModel = vi.hoisted(() => ({ findByPk: vi.fn() }))

vi.mock('#/database', () => ({ default: db }))
vi.mock('#/database/models/inventory', () => ({ default: inventoryModel, Inventory: inventoryModel }))
vi.mock('#/database/models/product', () => ({ default: productModel, Product: productModel }))
vi.mock('#/database/models/productVariant', () => ({ default: productVariantModel, ProductVariant: productVariantModel }))
vi.mock('#/database/models/transfer', () => ({ default: transferModel, Transfer: transferModel }))
vi.mock('#/database/models/warehouse', () => ({ default: warehouseModel, Warehouse: warehouseModel }))

import { WarehouseService } from '#/services/warehouse'

const tx = { commit: vi.fn(), rollback: vi.fn() }
const makeRow = (fields: Record<string, any>) => ({
  ...fields,
  get: (key: string) => fields[key],
  update: vi.fn(async (patch: any) => Object.assign(fields, patch)),
  increment: vi.fn(),
  save: vi.fn()
})

const req = (body: any) => ({ body, params: {}, query: {}, user: { vendorIds: [3] } }) as any

const stockRow = () =>
  makeRow({
    id: 1,
    productId: 42,
    warehouseId: 1,
    variantId: null,
    quantity: 10
  })

beforeEach(() => {
  vi.clearAllMocks()
  db.sequelize.transaction.mockResolvedValue(tx)
  warehouseModel.findByPk.mockImplementation(async (id: number) =>
    id === 1 ? { vendorId: 3 } : id === 2 ? { vendorId: 3 } : null
  )
  productModel.findByPk.mockResolvedValue({ id: 42, vendorId: 3 })
  // source stock row exists with 10 units
  inventoryModel.findOne.mockImplementation(async ({ where }: any) => {
    if (Number(where?.warehouseId) === 1) return stockRow()
    return null
  })
  // guarded decrement: 1 row affected
  inventoryModel.decrement.mockResolvedValue([[undefined, 1]])
  const destRow = makeRow({ id: 2, productId: 42, warehouseId: 2, quantity: 0 })
  inventoryModel.build.mockReturnValue({ save: vi.fn(async () => destRow) })
  transferModel.build.mockReturnValue({ save: vi.fn(async () => ({})) })
  db.transfer.build.mockReturnValue({ save: vi.fn(async () => ({})) })
})

describe('WarehouseService.transferStock', () => {
  it('moves stock: guarded decrement, destination upsert, auditable transfer row', async () => {
    const svc = new WarehouseService()
    const result = await svc.transferStock(
      req({ fromWarehouseId: 1, toWarehouseId: 2, items: [{ productId: 42, quantity: 4 }], note: 'rebalance' })
    )

    expect(result).toEqual({ transferred: [{ productId: 42, variantId: null, quantity: 4 }] })
    // source decrement guarded by quantity >= requested (Op.gte is a symbol key)
    const decArgs = inventoryModel.decrement.mock.calls[0][1]
    expect(decArgs.by).toBe(4)
    expect(decArgs.where.productId).toBe(42)
    expect(decArgs.where.warehouseId).toBe(1)
    expect(decArgs.where.variantId).toBeNull()
    const gteSymbol = Object.getOwnPropertySymbols(decArgs.where.quantity).find((s) => String(s).includes('gte'))
    expect(gteSymbol).toBeDefined()
    expect((decArgs.where.quantity as any)[gteSymbol!]).toBe(4)
    // destination upsert
    expect(inventoryModel.build).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 42, warehouseId: 2, variantId: null, quantity: 4 })
    )
    // one IN/OUT link row with both endpoints
    expect(transferModel.build).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 42,
        fromWarehouseId: 1,
        toWarehouseId: 2,
        quantity: 4,
        type: '1',
        status: 'note:rebalance'
      })
    )
    expect(tx.commit).toHaveBeenCalled()
    expect(tx.rollback).not.toHaveBeenCalled()
  })

  it('increments the existing destination row instead of creating a new one', async () => {
    const dest = makeRow({ id: 2, productId: 42, warehouseId: 2, quantity: 3 })
    inventoryModel.findOne.mockImplementation(async ({ where }: any) =>
      Number(where?.warehouseId) === 1 ? stockRow() : dest
    )
    const svc = new WarehouseService()
    await svc.transferStock(req({ fromWarehouseId: 1, toWarehouseId: 2, items: [{ productId: 42, quantity: 2 }] }))
    expect(dest.increment).toHaveBeenCalledWith('quantity', { by: 2, transaction: tx })
    expect(inventoryModel.build).not.toHaveBeenCalled()
  })

  it('rejects missing / equal warehouses and empty or invalid items', async () => {
    const svc = new WarehouseService()
    await expect(svc.transferStock(req({ toWarehouseId: 2, items: [{ productId: 42, quantity: 1 }] }))).rejects.toThrow(
      /fromWarehouseId and toWarehouseId are required/
    )
    await expect(svc.transferStock(req({ fromWarehouseId: 1, toWarehouseId: 1, items: [{ productId: 42, quantity: 1 }] }))).rejects.toThrow(
      /must differ/
    )
    await expect(svc.transferStock(req({ fromWarehouseId: 1, toWarehouseId: 2, items: [] }))).rejects.toThrow(
      'items are required'
    )
    await expect(
      svc.transferStock(req({ fromWarehouseId: 1, toWarehouseId: 2, items: [{ productId: 42, quantity: 0 }] }))
    ).rejects.toThrow(/positive quantity/)
    expect(tx.rollback).toHaveBeenCalled()
  })

  it('rejects cross-vendor transfers (403)', async () => {
    warehouseModel.findByPk.mockImplementation(async (id: number) =>
      id === 2 ? { vendorId: 9 } : { vendorId: 3 }
    )
    const svc = new WarehouseService()
    // the tenant guard on the destination fires before the same-vendor check
    await expect(
      svc.transferStock(req({ fromWarehouseId: 1, toWarehouseId: 2, items: [{ productId: 42, quantity: 1 }] }))
    ).rejects.toThrow(/Unauthorized destination warehouse/)
    expect(tx.rollback).toHaveBeenCalled()
  })

  it('rejects foreign products and unknown warehouses', async () => {
    productModel.findByPk.mockResolvedValue({ id: 42, vendorId: 9 })
    const svc = new WarehouseService()
    await expect(
      svc.transferStock(req({ fromWarehouseId: 1, toWarehouseId: 2, items: [{ productId: 42, quantity: 1 }] }))
    ).rejects.toThrow(/Unauthorized product/)

    warehouseModel.findByPk.mockResolvedValue(null)
    await expect(
      svc.transferStock(req({ fromWarehouseId: 1, toWarehouseId: 2, items: [{ productId: 42, quantity: 1 }] }))
    ).rejects.toThrow(/not found/)
  })

  it('rejects transferring stock the source does not have', async () => {
    // guarded decrement affects 0 rows -> insufficient stock
    inventoryModel.decrement.mockResolvedValue([[undefined, 0]])
    const svc = new WarehouseService()
    await expect(
      svc.transferStock(req({ fromWarehouseId: 1, toWarehouseId: 2, items: [{ productId: 42, quantity: 999 }] }))
    ).rejects.toThrow(/Insufficient stock in source warehouse/)
    expect(tx.rollback).toHaveBeenCalled()
  })

  it('rejects when the source has no stock row at all', async () => {
    inventoryModel.decrement.mockResolvedValue([[undefined, 0]])
    inventoryModel.findOne.mockResolvedValue(null)
    const svc = new WarehouseService()
    await expect(
      svc.transferStock(req({ fromWarehouseId: 1, toWarehouseId: 2, items: [{ productId: 42, quantity: 1 }] }))
    ).rejects.toThrow(/Stock row not found/)
  })

  it('supports variant-level transfers', async () => {
    productVariantModel.findByPk.mockResolvedValue({ productId: 42, id: 7 })
    inventoryModel.decrement.mockResolvedValue([[undefined, 1]])
    inventoryModel.findOne.mockImplementation(async ({ where }: any) => {
      if (Number(where?.warehouseId) === 1 && where?.variantId === 7) return stockRow()
      return null
    })
    const svc = new WarehouseService()
    const result = await svc.transferStock(
      req({ fromWarehouseId: 1, toWarehouseId: 2, items: [{ productId: 42, variantId: 7, quantity: 1 }] })
    )
    expect(result.transferred[0].variantId).toBe(7)
    const vArgs = inventoryModel.decrement.mock.calls[0][1]
    expect(vArgs.where.variantId).toBe(7)
  })

  it('rolls back and wraps failures as ApiError', async () => {
    inventoryModel.decrement.mockRejectedValue(new Error('db down'))
    const svc = new WarehouseService()
    await expect(
      svc.transferStock(req({ fromWarehouseId: 1, toWarehouseId: 2, items: [{ productId: 42, quantity: 1 }] }))
    ).rejects.toThrow()
    expect(tx.rollback).toHaveBeenCalled()
    expect(tx.commit).not.toHaveBeenCalled()
  })
})

export {}
