import database from '#/database'
import Inventory from '#/database/models/inventory'
import OrderDetail from '#/database/models/orderDetail'
import ProductBarcode from '#/database/models/productBarcode'
import ProductVariant from '#/database/models/productVariant'
import { ApiError } from '#/response'
import { Op, Transaction } from 'sequelize'

type CustomerType = 'retail' | 'wholesale'

const valueOf = (row: any, key: string) => row?.get?.(key) ?? row?.[key]

const affectedCount = (result: any): number => {
  if (Array.isArray(result)) return Number(result[1] ?? result[0] ?? 0)
  return Number(result ?? 0)
}

export class BarcodeService {
  sequelize = database.sequelize

  /**
   * Finds one sellable barcode and returns stock expressed across every known
   * unit. `warehouseId` is optional for catalogue search, but must be passed
   * by POS callers so displayed stock is not accidentally cross-warehouse.
   */
  async scanBarcode(barcode: string, customerType: CustomerType, warehouseId?: number) {
    const scanned: any = await ProductBarcode.findOne({
      where: { barcode },
      include: [{ model: ProductVariant, include: [{ association: 'product' }] }]
    })
    if (!scanned) throw new ApiError('Barcode not found', 404, { code: 'BARCODE_NOT_FOUND' })

    const variant = scanned.variant ?? valueOf(scanned, 'variant')
    const variantId = Number(valueOf(scanned, 'variantId'))
    const inventoryWhere: Record<string, unknown> = { variantId }
    if (warehouseId !== undefined) inventoryWhere.warehouseId = warehouseId
    const inventoryRows: any[] = await Inventory.findAll({ where: inventoryWhere })
    const baseQuantity = inventoryRows.reduce((sum, row) => sum + Number(valueOf(row, 'quantity') ?? 0), 0)
    const unitRows: any[] = await ProductBarcode.findAll({
      where: { variantId },
      include: [{ association: 'unit', attributes: ['id', 'name'] }],
      order: [
        ['conversionRate', 'DESC'],
        ['id', 'ASC']
      ]
    })

    return {
      barcode: this.serializeBarcode(scanned),
      variant,
      appliedPrice: this.resolvePrice(scanned, customerType),
      stock: {
        baseQuantity,
        display: this.formatMixedQuantity(baseQuantity, unitRows)
      }
    }
  }

  /**
   * Inventory is always stored in the base unit. `warehouseId` is mandatory
   * because variant-only stock is ambiguous in this multi-warehouse system.
   */
  async deductInventory(variantId: number, barcodeId: number, quantityScanned: number, warehouseId?: number) {
    if (!Number.isInteger(quantityScanned) || quantityScanned <= 0) {
      throw ApiError.badRequest('quantityScanned must be a positive integer', { code: 'INVALID_QUANTITY' })
    }
    if (!warehouseId)
      throw ApiError.badRequest('warehouseId is required to deduct inventory', { code: 'WAREHOUSE_REQUIRED' })

    return this.sequelize.transaction(async (transaction) => {
      const barcode: any = await ProductBarcode.findOne({
        where: { id: barcodeId, variantId },
        transaction,
        lock: Transaction.LOCK.UPDATE
      })
      if (!barcode)
        throw new ApiError('Barcode does not belong to this variant', 400, { code: 'BARCODE_VARIANT_MISMATCH' })

      const quantityToDeduct = quantityScanned * Number(valueOf(barcode, 'conversionRate'))
      const where = { variantId, warehouseId, quantity: { [Op.gte]: quantityToDeduct } } as any
      const affected = affectedCount(
        await Inventory.decrement('quantity', { by: quantityToDeduct, where, transaction })
      )
      if (affected === 0) {
        throw new ApiError('Insufficient inventory for this sale', 409, { code: 'INSUFFICIENT_STOCK' })
      }
      return { quantityToDeduct }
    })
  }

  /** Controller/API update handlers must use this before changing conversionRate. */
  async updateBarcode(barcodeId: number, changes: Partial<ProductBarcode>) {
    const barcode: any = await ProductBarcode.findByPk(barcodeId)
    if (!barcode) throw new ApiError('Barcode not found', 404, { code: 'BARCODE_NOT_FOUND' })
    if (
      changes.conversionRate !== undefined &&
      Number(changes.conversionRate) !== Number(valueOf(barcode, 'conversionRate'))
    ) {
      await this.assertConversionRateMutable(barcodeId)
    }
    await barcode.update(changes)
    return barcode
  }

  async assertConversionRateMutable(barcodeId: number) {
    const usedByOrderCount = await OrderDetail.count({ where: { barcodeId } })
    if (usedByOrderCount > 0) {
      throw new ApiError('conversionRate cannot be changed after the barcode has been used by an order', 409, {
        code: 'CONVERSION_RATE_LOCKED'
      })
    }
  }

  private resolvePrice(barcode: any, customerType: CustomerType): number {
    const wholesale = Number(valueOf(barcode, 'wholesalePrice'))
    if (customerType === 'wholesale' && Number.isFinite(wholesale)) return wholesale

    const promo = valueOf(barcode, 'promoPrice')
    const start = valueOf(barcode, 'promoStartAt')
    const end = valueOf(barcode, 'promoEndAt')
    const now = Date.now()
    const isActivePromo =
      promo !== null &&
      promo !== undefined &&
      (!start || new Date(start).getTime() <= now) &&
      (!end || now <= new Date(end).getTime())
    if (isActivePromo) return Number(promo)
    return Number(valueOf(barcode, 'retailPrice'))
  }

  private formatMixedQuantity(baseQuantity: number, barcodeRows: any[]): string {
    let remaining = baseQuantity
    const chunks: string[] = []
    const distinctRates = new Set<number>()
    for (const row of barcodeRows) {
      const rate = Number(valueOf(row, 'conversionRate'))
      if (!Number.isInteger(rate) || rate <= 0 || distinctRates.has(rate)) continue
      distinctRates.add(rate)
      const count = Math.floor(remaining / rate)
      if (count > 0) {
        const unit = row.unit ?? valueOf(row, 'unit')
        chunks.push(`${count} ${valueOf(unit, 'name') ?? 'unit'}`)
        remaining %= rate
      }
    }
    return chunks.length ? chunks.join(' ') : `0 ${valueOf(barcodeRows.at(-1)?.unit, 'name') ?? 'unit'}`
  }

  private serializeBarcode(row: any) {
    return {
      id: valueOf(row, 'id'),
      barcode: valueOf(row, 'barcode'),
      conversionRate: Number(valueOf(row, 'conversionRate')),
      unitId: valueOf(row, 'unitId')
    }
  }
}

export default BarcodeService
