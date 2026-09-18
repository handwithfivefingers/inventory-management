import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => {
  const warehouse = { findOne: vi.fn() }
  return {
    sequelize: { transaction: vi.fn() },
    warehouse,
    inventory: { sum: vi.fn() },
    order: { count: vi.fn() }
  }
})

vi.mock('#/database', () => ({ default: db }))
vi.mock('#/utils/entity-cache', () => ({
  evictCachedEntity: vi.fn(),
  getCachedEntity: vi.fn(),
  setCachedEntity: vi.fn()
}))

import { WarehouseService } from '#/services/warehouse'

const transaction = { commit: vi.fn(), rollback: vi.fn() }
const warehouseRow = (fields: Record<string, unknown>) => ({ ...fields, destroy: vi.fn() })

describe('WarehouseService.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.sequelize.transaction.mockResolvedValue(transaction)
    db.warehouse.findOne.mockResolvedValue(warehouseRow({ id: 4, vendorId: 2, isMain: false }))
    db.inventory.sum.mockResolvedValue(0)
    db.order.count.mockResolvedValue(0)
  })

  it('soft-deletes a non-main warehouse with no positive stock or unfinished orders', async () => {
    const result = await new WarehouseService().delete({ id: 4, vendorId: 2 })

    expect(result).toBe(true)
    expect(db.inventory.sum).toHaveBeenCalledWith(
      'quantity',
      expect.objectContaining({ where: { warehouseId: 4 }, transaction })
    )
    expect(db.order.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ warehouseId: 4 }), transaction })
    )
    expect((await db.warehouse.findOne.mock.results[0].value).destroy).toHaveBeenCalledWith({ transaction })
    expect(transaction.commit).toHaveBeenCalled()
  })

  it('rejects the main warehouse', async () => {
    db.warehouse.findOne.mockResolvedValue(warehouseRow({ id: 4, vendorId: 2, isMain: true }))

    await expect(new WarehouseService().delete({ id: 4, vendorId: 2 })).rejects.toMatchObject({
      message: 'Main warehouse cannot be deleted',
      status: 409
    })
    expect(db.inventory.sum).not.toHaveBeenCalled()
    expect(transaction.rollback).toHaveBeenCalled()
  })

  it('requires stock to be transferred before deletion', async () => {
    db.inventory.sum.mockResolvedValue('1')

    await expect(new WarehouseService().delete({ id: 4, vendorId: 2 })).rejects.toMatchObject({
      message: 'Warehouse still has inventory. Transfer stock before deleting it',
      status: 409
    })
    expect(db.order.count).not.toHaveBeenCalled()
  })

  it('rejects warehouses linked to unfinished orders', async () => {
    db.order.count.mockResolvedValue(1)

    await expect(new WarehouseService().delete({ id: 4, vendorId: 2 })).rejects.toMatchObject({
      message: 'Warehouse is linked to unfinished orders',
      status: 409
    })
  })

  it('does not reveal warehouses outside the active vendor', async () => {
    db.warehouse.findOne.mockResolvedValue(null)

    await expect(new WarehouseService().delete({ id: 4, vendorId: 2 })).rejects.toMatchObject({
      message: 'Warehouse not found',
      status: 404
    })
  })
})
