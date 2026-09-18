import OrderDetail from '#/database/models/orderDetail'
import ProductBarcode from '#/database/models/productBarcode'
import Unit from '#/database/models/units'
import { ApiError } from '#/response'
import { nextSequence } from '#/utils/sequence'
import { Op, Transaction } from 'sequelize'
import { BarcodeInput } from './product.types'

const decimal = (value: unknown, field: string, nullable = false): number | null => {
  if (nullable && (value === null || value === undefined || value === '')) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) throw ApiError.badRequest(`${field} must be a non-negative number`)
  return parsed
}

/**
 * Allocate a numeric, twelve-character barcode from an atomic sequence.
 * The sequence is deliberately independent of SKU generation: SKU values can
 * contain letters, while a generated barcode must remain scanner-friendly.
 */
const generateBarcode = async (transaction: Transaction): Promise<string> => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const sequence = await nextSequence('product-barcode', null, { transaction })
    const barcode = String(sequence).padStart(12, '0')
    if (barcode.length > 12) throw ApiError.badRequest('Unable to generate a barcode of at most 12 digits')
    const existing = await ProductBarcode.findOne({ where: { barcode }, transaction })
    if (!existing) return barcode
  }
  throw ApiError.conflict('Unable to generate a unique barcode')
}

const defaultUnitId = async (vendorId: number, transaction: Transaction): Promise<number> => {
  const unit: any = await Unit.findOne({
    where: { name: 'Cái', vendorId },
    order: [['id', 'ASC']],
    transaction
  })
  const id = Number(unit?.get?.('id') ?? unit?.id)
  if (Number.isSafeInteger(id) && id > 0) return id
  const created: any = await Unit.create({ name: 'Cái', vendorId }, { transaction })
  return Number(created.get('id'))
}

const normalize = async (input: BarcodeInput, vendorId: number, transaction: Transaction, fallbackUnitId?: number | string | null) => {
  // A null/omitted identifier asks the server to allocate one. Any supplied
  // value, including an empty string, remains a manual value and is validated.
  const barcode = input.barcode == null ? await generateBarcode(transaction) : String(input.barcode).trim()
  if (!barcode || barcode.length > 64) throw ApiError.badRequest('barcodes[].barcode must be 1 to 64 characters')
  // Default variants always use the vendor's `Cái` unit. A supplied unit is
  // retained for existing/explicit pricing rows; the old product.unitId is
  // deliberately not used as an implicit base-unit substitute.
  const unitId = input.unitId ?? (await defaultUnitId(vendorId, transaction))
  const conversionRate = Number(input.conversionRate ?? 1)
  if (!Number.isInteger(conversionRate) || conversionRate <= 0) {
    throw ApiError.badRequest('barcodes[].conversionRate must be a positive integer')
  }
  const costPrice = decimal(input.costPrice ?? 0, 'barcodes[].costPrice')!
  const retailPrice = decimal(input.retailPrice ?? 0, 'barcodes[].retailPrice')!
  const wholesalePrice = decimal(input.wholesalePrice ?? 0, 'barcodes[].wholesalePrice')!
  const promoPrice = decimal(input.promoPrice, 'barcodes[].promoPrice', true)
  if (retailPrice < costPrice) throw ApiError.badRequest('retailPrice must be greater than or equal to costPrice')
  if (wholesalePrice > retailPrice) throw ApiError.badRequest('wholesalePrice must be less than or equal to retailPrice')
  if (promoPrice !== null && promoPrice >= retailPrice) throw ApiError.badRequest('promoPrice must be less than retailPrice')
  return {
    ...input,
    barcode,
    unitId,
    conversionRate,
    costPrice,
    retailPrice,
    wholesalePrice,
    promoPrice
  }
}

/** Replace a variant's barcode set atomically, preserving sold-unit history. */
export const syncVariantBarcodes = async (
  variantId: number,
  vendorId: number,
  input: BarcodeInput[] | undefined | null,
  transaction: Transaction,
  fallbackUnitId?: number | string | null
): Promise<void> => {
  const payload = Array.isArray(input) && input.length ? input : ([{}] as BarcodeInput[])
  const rows = await Promise.all(payload.map((row) => normalize(row, vendorId, transaction, fallbackUnitId)))
  if (new Set(rows.map((row) => row.barcode.toUpperCase())).size !== rows.length) {
    throw ApiError.conflict('Barcode values must be unique within a variant', { code: 'BARCODE_DUPLICATE' })
  }
  if (rows.filter((row) => row.conversionRate === 1).length !== 1) {
    throw ApiError.badRequest('Each variant must have exactly one base unit (conversionRate = 1)', { code: 'VALIDATION_ERROR' })
  }
  const unitIds = rows.map((row) => Number(row.unitId))
  if (unitIds.some((id) => !Number.isSafeInteger(id) || id < 1)) throw ApiError.badRequest('barcodes[].unitId is invalid')
  const duplicateUnitId = unitIds.find((unitId, index) => unitIds.indexOf(unitId) !== index)
  if (duplicateUnitId !== undefined) {
    const unit: any = await Unit.findByPk(duplicateUnitId, { transaction })
    const unitName = unit?.get?.('name') ?? unit?.name ?? String(duplicateUnitId)
    throw ApiError.badRequest(`Unit '${unitName}' is duplicated in this variant`, { code: 'VALIDATION_ERROR' })
  }
  const units: any[] = await Unit.findAll({
    where: { id: unitIds, [Op.or]: [{ vendorId }, { vendorId: null }] },
    transaction
  })
  if (units.length !== new Set(unitIds).size) throw ApiError.badRequest('Every barcode unit must belong to the product vendor')

  const existing: any[] = await ProductBarcode.findAll({ where: { variantId }, transaction })
  const existingById = new Map(existing.map((row) => [Number(row.get('id')), row]))
  const kept = new Set<number>()
  for (const row of rows) {
    const id = row.id == null ? null : Number(row.id)
    const attributes = {
      variantId, unitId: Number(row.unitId), barcode: row.barcode, conversionRate: row.conversionRate,
      costPrice: row.costPrice, retailPrice: row.retailPrice, wholesalePrice: row.wholesalePrice,
      promoPrice: row.promoPrice, promoStartAt: row.promoStartAt || null, promoEndAt: row.promoEndAt || null
    }
    if (id) {
      const current = existingById.get(id)
      if (!current) throw ApiError.badRequest('Barcode does not belong to this variant')
      const hasSales = await OrderDetail.count({ where: { barcodeId: id }, transaction })
      if (hasSales && Number(current.get('conversionRate')) !== row.conversionRate) {
        throw ApiError.conflict('Cannot change conversionRate after a barcode has been sold')
      }
      const duplicate: any = await ProductBarcode.findOne({ where: { barcode: row.barcode }, transaction })
      if (duplicate && Number(duplicate.get('id')) !== id) throw ApiError.conflict('Barcode already exists', { code: 'BARCODE_DUPLICATE' })
      await current.update(attributes, { transaction })
      kept.add(id)
    } else {
      const duplicate = await ProductBarcode.findOne({ where: { barcode: row.barcode }, transaction })
      if (duplicate) throw ApiError.conflict('Barcode already exists', { code: 'BARCODE_DUPLICATE' })
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

  // Re-read under the caller's transaction lock after every insert/update/delete.
  // This enforces the lower bound even if the payload handling changes later.
  const baseRows = await ProductBarcode.findAll({
    where: { variantId, conversionRate: 1 },
    transaction,
    ...(transaction.LOCK?.UPDATE && { lock: transaction.LOCK.UPDATE })
  })
  if (baseRows.length === 0) {
    throw ApiError.badRequest('Each variant must have at least 1 base unit (conversionRate = 1)', {
      code: 'VALIDATION_ERROR'
    })
  }
}
