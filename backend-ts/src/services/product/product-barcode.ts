import OrderDetail from '#/database/models/orderDetail'
import ProductBarcode from '#/database/models/productBarcode'
import Unit from '#/database/models/units'
import { ApiError } from '#/response'
import { Transaction } from 'sequelize'
import { BarcodeInput } from './product.types'

const decimal = (value: unknown, field: string, nullable = false): number | null => {
  if (nullable && (value === null || value === undefined || value === '')) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) throw ApiError.badRequest(`${field} must be a non-negative number`)
  return parsed
}

export const isBaseUnitConversion = (conversionRate: number) => conversionRate === 1

const normalize = (input: BarcodeInput) => {
  const barcode = String(input.barcode ?? '').trim()
  if (!barcode || barcode.length > 64) throw ApiError.badRequest('barcodes[].barcode must be 1 to 64 characters')
  const conversionRate = Number(input.conversionRate)
  if (!Number.isInteger(conversionRate) || conversionRate <= 0) {
    throw ApiError.badRequest('barcodes[].conversionRate must be a positive integer')
  }
  const costPrice = decimal(input.costPrice, 'barcodes[].costPrice')!
  const retailPrice = decimal(input.retailPrice, 'barcodes[].retailPrice')!
  const wholesalePrice = decimal(input.wholesalePrice, 'barcodes[].wholesalePrice')!
  const promoPrice = decimal(input.promoPrice, 'barcodes[].promoPrice', true)
  if (retailPrice < costPrice) throw ApiError.badRequest('retailPrice must be greater than or equal to costPrice')
  if (wholesalePrice > retailPrice) throw ApiError.badRequest('wholesalePrice must be less than or equal to retailPrice')
  if (promoPrice !== null && promoPrice >= retailPrice) throw ApiError.badRequest('promoPrice must be less than retailPrice')
  // A base unit is the unit whose conversion equals one. This is derived on
  // the server so a client cannot accidentally mark a pack/carton as base.
  return {
    ...input,
    barcode,
    conversionRate,
    costPrice,
    retailPrice,
    wholesalePrice,
    promoPrice,
    isBaseUnit: isBaseUnitConversion(conversionRate)
  }
}

/** Replace a variant's barcode set atomically, preserving sold-unit history. */
export const syncVariantBarcodes = async (
  variantId: number,
  vendorId: number,
  input: BarcodeInput[] | undefined,
  transaction: Transaction
): Promise<void> => {
  if (!Array.isArray(input) || input.length === 0) throw ApiError.badRequest('variants[].barcodes is required')
  const rows = input.map(normalize)
  if (rows.filter((row) => Boolean(row.isBaseUnit)).length !== 1) {
    throw ApiError.badRequest('Each variant must have exactly one base barcode')
  }
  if (new Set(rows.map((row) => row.barcode.toUpperCase())).size !== rows.length) {
    throw ApiError.conflict('Barcode values must be unique within a variant')
  }
  const unitIds = rows.map((row) => Number(row.unitId))
  if (unitIds.some((id) => !Number.isSafeInteger(id) || id < 1)) throw ApiError.badRequest('barcodes[].unitId is invalid')
  const units: any[] = await Unit.findAll({ where: { id: unitIds, vendorId }, transaction })
  if (units.length !== new Set(unitIds).size) throw ApiError.badRequest('Every barcode unit must belong to the product vendor')

  const existing: any[] = await ProductBarcode.findAll({ where: { variantId }, transaction })
  const existingById = new Map(existing.map((row) => [Number(row.get('id')), row]))
  const kept = new Set<number>()
  for (const row of rows) {
    const id = row.id == null ? null : Number(row.id)
    const attributes = {
      variantId, unitId: Number(row.unitId), barcode: row.barcode, conversionRate: row.conversionRate,
      costPrice: row.costPrice, retailPrice: row.retailPrice, wholesalePrice: row.wholesalePrice,
      promoPrice: row.promoPrice, promoStartAt: row.promoStartAt || null, promoEndAt: row.promoEndAt || null,
      isBaseUnit: Boolean(row.isBaseUnit)
    }
    if (id) {
      const current = existingById.get(id)
      if (!current) throw ApiError.badRequest('Barcode does not belong to this variant')
      const hasSales = await OrderDetail.count({ where: { barcodeId: id }, transaction })
      if (hasSales && Number(current.get('conversionRate')) !== row.conversionRate) {
        throw ApiError.conflict('Cannot change conversionRate after a barcode has been sold')
      }
      await current.update(attributes, { transaction })
      kept.add(id)
    } else {
      await ProductBarcode.create(attributes, { transaction })
    }
  }
  for (const row of existing) {
    const id = Number(row.get('id'))
    if (kept.has(id)) continue
    if (await OrderDetail.count({ where: { barcodeId: id }, transaction })) {
      throw ApiError.conflict('Cannot remove a barcode referenced by an order')
    }
    await row.destroy({ transaction })
  }
}
