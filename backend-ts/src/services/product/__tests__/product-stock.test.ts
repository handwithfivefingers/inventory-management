import { beforeEach, describe, expect, it, vi } from 'vitest'
import Inventory from '#/database/models/inventory'
import ProductBarcode from '#/database/models/productBarcode'
import Transfer from '#/database/models/transfer'
import { adjustStockByBarcode } from '../product-stock'

const transaction: any = { LOCK: { UPDATE: 'UPDATE' } }
const valueRow = (values: Record<string, unknown>) => ({ get: (key: string) => values[key], update: vi.fn() })

describe('adjustStockByBarcode', () => {
  beforeEach(() => vi.clearAllMocks())

  const barcode = (negative = false) => valueRow({
    variantId: 4,
    conversionRate: 12,
    productVariant: valueRow({ productId: 9, isNegative: negative })
  })

  it('converts an IN movement to base quantity and writes an audit transfer', async () => {
    ;(ProductBarcode.findOne as any).mockResolvedValue(barcode())
    const inventory = valueRow({ quantity: 5 })
    ;(Inventory.findOne as any).mockResolvedValue(inventory)
    await adjustStockByBarcode({ barcode: 'PACK-12', quantity: 2, type: 'IN', warehouseId: 3, transaction })
    expect(inventory.update).toHaveBeenCalledWith({ quantity: 29 }, { transaction })
    expect(Transfer.create).toHaveBeenCalledWith(expect.objectContaining({ quantity: 24, type: '0', variantId: 4 }), { transaction })
  })

  it('rejects an OUT movement that would make a non-negative variant negative', async () => {
    ;(ProductBarcode.findOne as any).mockResolvedValue(barcode())
    ;(Inventory.findOne as any).mockResolvedValue(valueRow({ quantity: 10 }))
    await expect(adjustStockByBarcode({ barcode: 'PACK-12', quantity: 1, type: 'OUT', warehouseId: 3, transaction }))
      .rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK', status: 400 })
    expect(Transfer.create).not.toHaveBeenCalled()
  })

  it('allows an OUT movement below zero when the variant allows negative stock', async () => {
    ;(ProductBarcode.findOne as any).mockResolvedValue(barcode(true))
    const inventory = valueRow({ quantity: 10 })
    ;(Inventory.findOne as any).mockResolvedValue(inventory)
    await adjustStockByBarcode({ barcode: 'PACK-12', quantity: 1, type: 'OUT', warehouseId: 3, transaction })
    expect(inventory.update).toHaveBeenCalledWith({ quantity: -2 }, { transaction })
    expect(Transfer.create).toHaveBeenCalledWith(expect.objectContaining({ type: '1', quantity: 12 }), { transaction })
  })
})
