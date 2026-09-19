import { beforeEach, describe, expect, it, vi } from 'vitest'

const nextSequence = vi.hoisted(() => vi.fn())

vi.mock('#/utils/sequence', () => ({ nextSequence }))

import ProductBarcode from '#/database/models/productBarcode'
import Unit from '#/database/models/units'
import { syncVariantBarcodes } from '../product-barcode'

describe('syncVariantBarcodes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates a base barcode when the submitted barcode is null', async () => {
    const transaction: any = {}
    nextSequence.mockResolvedValue(42)
    ;(ProductBarcode.findOne as any).mockResolvedValue(null)
    ;(ProductBarcode.findAll as any).mockResolvedValueOnce([]).mockResolvedValueOnce([{ get: () => 1 }])
    ;(ProductBarcode.create as any).mockResolvedValue({})
    ;(Unit.findAll as any).mockResolvedValue([{ id: 7 }])
    ;(Unit.findOne as any).mockResolvedValue({ id: 7 })

    await syncVariantBarcodes(
      3,
      2,
      [{ barcode: null, unitId: 7, conversionRate: 1, costPrice: 10, retailPrice: 15, wholesalePrice: 12 }],
      transaction
    )

    expect(nextSequence).toHaveBeenCalledWith('product-barcode', null, { transaction })
    expect(ProductBarcode.create).toHaveBeenCalledWith(
      expect.objectContaining({ barcode: '000000000042', unitId: 7 }),
      { transaction }
    )
  })

  it('creates a complete base barcode from the vendor default unit when no barcode payload is sent', async () => {
    const transaction: any = {}
    nextSequence.mockResolvedValue(43)
    ;(ProductBarcode.findOne as any).mockResolvedValue(null)
    ;(ProductBarcode.findAll as any).mockResolvedValueOnce([]).mockResolvedValueOnce([{ get: () => 1 }])
    ;(ProductBarcode.create as any).mockResolvedValue({})
    ;(Unit.findOne as any).mockResolvedValue({ id: 9 })
    ;(Unit.findAll as any).mockResolvedValue([{ id: 9 }])

    await syncVariantBarcodes(3, 2, undefined, transaction)

    expect(ProductBarcode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        barcode: '000000000043',
        unitId: 9,
        conversionRate: 1,
        costPrice: 0,
        retailPrice: 0,
        wholesalePrice: 0
      }),
      { transaction }
    )
  })

  it('rejects invalid price ordering before writing a barcode row', async () => {
    await expect(syncVariantBarcodes(3, 2, [
      { barcode: 'BAD-PRICE', unitId: 7, conversionRate: 1, costPrice: 20, retailPrice: 10, wholesalePrice: 9 }
    ], {} as any)).rejects.toMatchObject({ status: 400 })
    expect(ProductBarcode.create).not.toHaveBeenCalled()
  })

  it('requires exactly one conversion-rate-one barcode', async () => {
    await expect(syncVariantBarcodes(3, 2, [
      { barcode: 'BASE-A', unitId: 7, conversionRate: 1, costPrice: 0, retailPrice: 1, wholesalePrice: 1 },
      { barcode: 'BASE-B', unitId: 8, conversionRate: 1, costPrice: 0, retailPrice: 1, wholesalePrice: 1 }
    ], {} as any)).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 })
  })
})
