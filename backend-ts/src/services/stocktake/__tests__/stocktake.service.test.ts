import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Unit tests for StocktakeService — the stocktake (đồng kiểm) feature.
 * Covers: start (snapshot), the one-open-session guard, updateLines,
 * complete (variance -> corrective transfer), cancel, and tenant guards.
 */

const db = vi.hoisted(() => {
  const MODEL_METHODS = ['findOne', 'findAll', 'findByPk', 'create', 'build', 'count']
  const mk = () => {
    const m: any = {}
    for (const k of MODEL_METHODS) m[k] = vi.fn()
    return m
  }
  return { sequelize: { transaction: vi.fn() }, warehouse: mk(), transfer: { build: vi.fn() } }
})

const stocktakeModel = vi.hoisted(() => ({ findByPk: vi.fn(), findOne: vi.fn(), create: vi.fn(), build: vi.fn(), count: vi.fn() }))
const stocktakeDetailModel = vi.hoisted(() => ({ bulkCreate: vi.fn(), findOne: vi.fn(), findAll: vi.fn(), build: vi.fn() }))
const inventoryModel = vi.hoisted(() => ({ findAll: vi.fn(), findOne: vi.fn(), build: vi.fn() }))
const productModel = vi.hoisted(() => ({ findAll: vi.fn() }))
const productVariantModel = vi.hoisted(() => ({ findAll: vi.fn() }))
const warehouseModel = vi.hoisted(() => ({ findByPk: vi.fn() }))

vi.mock('#/database', () => ({ default: db }))
vi.mock('#/database/models/stocktake', () => ({ default: stocktakeModel, Stocktake: stocktakeModel }))
vi.mock('#/database/models/stocktakeDetail', () => ({ default: stocktakeDetailModel, StocktakeDetail: stocktakeDetailModel }))
vi.mock('#/database/models/inventory', () => ({ default: inventoryModel, Inventory: inventoryModel }))
vi.mock('#/database/models/product', () => ({ default: productModel, Product: productModel }))
vi.mock('#/database/models/productVariant', () => ({ default: productVariantModel, ProductVariant: productVariantModel }))
vi.mock('#/database/models/warehouse', () => ({ default: warehouseModel, Warehouse: warehouseModel }))

import { StocktakeService } from '#/services/stocktake'

const tx = { commit: vi.fn(), rollback: vi.fn() }
const makeRow = (fields: Record<string, any>) => {
  const row: any = {
    ...fields,
    get: (key: string) => fields[key],
    update: vi.fn(async (patch: any) => Object.assign(fields, patch))
  }
  // .save() resolves to the instance itself (Sequelize semantics)
  row.save = vi.fn(async () => row)
  return row
}

const req = (body: any, params: any = {}) =>
  ({ body, params: { id: 1, ...params }, query: {}, user: { vendorIds: [3] } }) as any

beforeEach(() => {
  vi.clearAllMocks()
  db.sequelize.transaction.mockResolvedValue(tx)
  // tenant.assertWarehouseAccess -> database.warehouse.findByPk
  db.warehouse.findByPk.mockResolvedValue({ vendorId: 3 })
  db.transfer.build.mockReturnValue({ save: vi.fn(async () => ({})) })
})

describe('StocktakeService.start', () => {
  it('snapshots every inventory row of the warehouse into details', async () => {
    stocktakeModel.findOne.mockResolvedValue(null) // no open session
    stocktakeModel.count.mockResolvedValue(0)
    const session = makeRow({ id: 5, code: 'ST-x' })
    stocktakeModel.build.mockReturnValue(session)
    inventoryModel.findAll.mockResolvedValue([
      { get: (k: string) => ({ productId: 42, variantId: null, quantity: 7 }[k]) },
      { get: (k: string) => ({ productId: 43, variantId: null, quantity: 0 }[k]) }
    ])

    const svc = new StocktakeService()
    const result = await svc.start(req({ warehouseId: 1, note: 'count' }))

    expect(result).toBe(session)
    expect(stocktakeModel.build).toHaveBeenCalledWith(expect.objectContaining({ warehouseId: 1, vendorId: 3, status: 'open' }))
    expect(stocktakeDetailModel.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({ productId: 42, variantId: null, expectedQuantity: 7 }),
        expect.objectContaining({ productId: 43, variantId: null, expectedQuantity: 0 })
      ],
      { transaction: tx }
    )
    expect(tx.commit).toHaveBeenCalled()
  })

  it('refuses to open a second session while one is open', async () => {
    stocktakeModel.findOne.mockResolvedValue(makeRow({ id: 9, status: 'open' }))
    const svc = new StocktakeService()
    await expect(svc.start(req({ warehouseId: 1 }))).rejects.toThrow(/already has an open stocktake session/)
    expect(tx.rollback).toHaveBeenCalled()
  })

  it('requires a warehouse the caller may access', async () => {
    db.warehouse.findByPk.mockResolvedValue(null)
    const svc = new StocktakeService()
    await expect(svc.start(req({ warehouseId: 404 }))).rejects.toThrow(/not found/)
  })
})

describe('StocktakeService.updateLines', () => {
  it('updates actualQuantity/note per matching detail id and ignores foreign ids', async () => {
    const session = makeRow({ id: 1, vendorId: 3, status: 'open' })
    stocktakeModel.findByPk.mockResolvedValue(session)
    const d1 = makeRow({ id: 11, stocktakeId: 1, expectedQuantity: 5 })
    const d2 = makeRow({ id: 12, stocktakeId: 1, expectedQuantity: 2 })
    stocktakeDetailModel.findOne.mockImplementation(async ({ where }: any) =>
      where.id === 11 ? d1 : where.id === 12 ? d2 : null
    )

    const svc = new StocktakeService()
    const result = await svc.updateLines(
      req({ lines: [{ id: 11, actualQuantity: 4, note: 'hỏng 1' }, { id: 999, actualQuantity: 1 }] })
    )

    expect(result).toBe(true)
    expect(d1.update).toHaveBeenCalledWith({ actualQuantity: 4, note: 'hỏng 1' }, { transaction: tx })
    expect(d2.update).not.toHaveBeenCalled()
    expect(tx.commit).toHaveBeenCalled()
  })

  it('rejects updates on closed sessions', async () => {
    stocktakeModel.findByPk.mockResolvedValue(makeRow({ id: 1, vendorId: 3, status: 'completed' }))
    const svc = new StocktakeService()
    await expect(svc.updateLines(req({ lines: [{ id: 11, actualQuantity: 1 }] }))).rejects.toThrow(/Only open sessions/)
  })

  it('tolerates an empty lines payload (no-op)', async () => {
    stocktakeModel.findByPk.mockResolvedValue(makeRow({ id: 1, vendorId: 3, status: 'open' }))
    stocktakeDetailModel.findOne.mockResolvedValue(null)
    const svc = new StocktakeService()
    expect(await svc.updateLines(req({}))).toBe(true)
    expect(stocktakeDetailModel.findOne).not.toHaveBeenCalled()
  })
})

describe('StocktakeService.complete', () => {
  it('applies variances: inventory set to actual + corrective transfer row', async () => {
    const session = makeRow({ id: 1, vendorId: 3, status: 'open', warehouseId: 5, code: 'ST-1' })
    stocktakeModel.findByPk.mockResolvedValue(session)
    stocktakeDetailModel.findAll.mockResolvedValue([
      // surplus +1 (expected 3, counted 4)
      makeRow({ id: 11, productId: 42, variantId: null, expectedQuantity: 3, actualQuantity: 4 }),
      // shortage -2 (expected 7, counted 5)
      makeRow({ id: 12, productId: 43, variantId: null, expectedQuantity: 7, actualQuantity: 5 }),
      // not counted -> untouched
      makeRow({ id: 13, productId: 44, variantId: null, expectedQuantity: 1, actualQuantity: null }),
      // no variance -> untouched
      makeRow({ id: 14, productId: 45, variantId: null, expectedQuantity: 2, actualQuantity: 2 })
    ])
    const inv42 = makeRow({ quantity: 3 })
    const inv43 = makeRow({ quantity: 7 })
    inventoryModel.findOne.mockImplementation(async ({ where }: any) =>
      where.productId === 42 ? inv42 : where.productId === 43 ? inv43 : null
    )
    inventoryModel.build.mockReturnValue({ save: vi.fn(async () => ({})) })

    const svc = new StocktakeService()
    const result = await svc.complete(req({ note: 'done' }))

    expect(result).toEqual({ adjusted: 2, total: 4 })
    expect(inv42.update).toHaveBeenCalledWith({ quantity: 4 }, { transaction: tx })
    expect(inv43.update).toHaveBeenCalledWith({ quantity: 5 }, { transaction: tx })
    // two corrective transfers: surplus IN ('0'), shortage OUT ('1')
    expect(db.transfer.build).toHaveBeenCalledTimes(2)
    const [surplus, shortage] = db.transfer.build.mock.calls
    expect(surplus[0]).toMatchObject({ productId: 42, quantity: 1, type: '0' })
    expect(shortage[0]).toMatchObject({ productId: 43, quantity: 2, type: '1', status: 'stocktake:ST-1' })
    expect(session.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }), { transaction: tx })
    expect(tx.commit).toHaveBeenCalled()
  })

  it('creates a missing inventory row when the variance is on an unknown row', async () => {
    const session = makeRow({ id: 1, vendorId: 3, status: 'open', warehouseId: 5, code: 'ST-2' })
    stocktakeModel.findByPk.mockResolvedValue(session)
    stocktakeDetailModel.findAll.mockResolvedValue([
      makeRow({ id: 11, productId: 42, variantId: 7, expectedQuantity: 0, actualQuantity: 3 })
    ])
    inventoryModel.findOne.mockResolvedValue(null)
    inventoryModel.build.mockReturnValue({ save: vi.fn(async () => ({})) })

    const svc = new StocktakeService()
    const result = await svc.complete(req({}))

    expect(result.adjusted).toBe(1)
    // build receives the row fields; save carries the transaction
    expect(inventoryModel.build).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 42, variantId: 7, warehouseId: 5, quantity: 3 })
    )
    expect(inventoryModel.build.mock.results[0].value.save).toHaveBeenCalledWith({ transaction: tx })
  })

  it('refuses to complete a non-open session', async () => {
    stocktakeModel.findByPk.mockResolvedValue(makeRow({ id: 1, vendorId: 3, status: 'cancelled' }))
    const svc = new StocktakeService()
    await expect(svc.complete(req({}))).rejects.toThrow(/Only open sessions/)
  })

  it('guards foreign sessions (403)', async () => {
    stocktakeModel.findByPk.mockResolvedValue(makeRow({ id: 1, vendorId: 9, status: 'open' }))
    const svc = new StocktakeService()
    await expect(svc.complete(req({}))).rejects.toThrow(/Unauthorized stocktake session/)
  })
})

describe('StocktakeService.cancel', () => {
  it('cancels an open session', async () => {
    const session = makeRow({ id: 1, vendorId: 3, status: 'open' })
    stocktakeModel.findByPk.mockResolvedValue(session)
    const svc = new StocktakeService()
    expect(await svc.cancel(req({}))).toBe(true)
    expect(session.update).toHaveBeenCalledWith({ status: 'cancelled' }, { transaction: tx })
  })

  it('refuses to cancel a completed session', async () => {
    stocktakeModel.findByPk.mockResolvedValue(makeRow({ id: 1, vendorId: 3, status: 'completed' }))
    const svc = new StocktakeService()
    await expect(svc.cancel(req({}))).rejects.toThrow(/Only open sessions can be cancelled/)
  })

  it('rolls back on failure', async () => {
    stocktakeModel.findByPk.mockRejectedValue(new Error('db down'))
    const svc = new StocktakeService()
    await expect(svc.cancel(req({}))).rejects.toThrow()
    expect(tx.rollback).toHaveBeenCalled()
  })
})

export {}
