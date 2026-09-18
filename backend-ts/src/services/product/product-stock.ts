import Inventory from '#/database/models/inventory'
import ProductBarcode from '#/database/models/productBarcode'
import ProductVariant from '#/database/models/productVariant'
import Transfer from '#/database/models/transfer'
import { ApiError } from '#/response'
import { Transaction } from 'sequelize'

export interface AdjustStockParams {
  productId: number
  /** Stock is always tracked against a concrete product variant. */
  variantId: number | string
  warehouseId: number
  /** Absolute quantity the row should end up at. */
  target: number
  transaction?: Transaction
}

/**
 * Set a product/variant's stock in a warehouse to an absolute `target`,
 * creating the inventory row if missing and logging the delta as a Transfer
 * (type '0' = in, '1' = out) so stock history stays auditable.
 *
 * Replaces the original `adjustSimpleStock` and `adjustVariantStock`, which
 * were identical except for the `variantId` filter.
 */
export const adjustStock = async ({
  productId,
  variantId,
  warehouseId,
  target,
  transaction
}: AdjustStockParams): Promise<void> => {
  if (!Number.isFinite(target)) throw new Error('Invalid quantity')
  if (variantId === undefined || variantId === null || variantId === '') throw new Error('variantId is required')

  const row: any = await Inventory.findOne({ where: { productId, variantId, warehouseId }, transaction })
  const current = Number(row?.get('quantity') ?? 0)
  const delta = target - current

  if (row) {
    await row.update({ quantity: target }, { transaction })
  } else if (target !== 0) {
    await Inventory.build({ warehouseId, quantity: target, productId, variantId }).save({
      transaction
    })
  }

  if (delta !== 0) {
    await Transfer.build({
      fromWarehouseId: warehouseId,
      quantity: Math.abs(delta),
      productId,
      variantId,
      type: delta > 0 ? '0' : '1'
    }).save({ transaction })
  }
}

export interface CreateOpeningStockParams {
  productId: number
  variantId: number | string
  warehouseId: number
  quantity: number
  transaction?: Transaction
}

/**
 * Create the opening Inventory + Transfer('0') pair for a brand-new
 * product/variant. A zero row is still created, so the warehouse scope is
 * explicit from the moment a sellable variant is created; zero does not create
 * a transfer audit record.
 */
export const createOpeningStock = async ({
  productId,
  variantId,
  warehouseId,
  quantity,
  transaction
}: CreateOpeningStockParams) => {
  if (variantId === undefined || variantId === null || variantId === '') throw new Error('variantId is required')
  const inventory: any = await Inventory.create(
    {
      warehouseId,
      quantity,
      productId,
      variantId
    },
    { transaction }
  )

  const transfer: any = quantity ? await Transfer.create(
    {
      fromWarehouseId: warehouseId,
      quantity,
      productId,
      variantId,
      type: '0'
    },
    { transaction }
  ) : null

  return { inventory, transfer }
}

/** Adjust stock by a scanned selling barcode. Quantities in inventories remain
 * base-unit quantities; barcode conversion is applied only at this boundary. */
export const adjustStockByBarcode = async ({
  barcode,
  quantity,
  type,
  warehouseId,
  transaction
}: {
  barcode: string
  quantity: number
  type: 'IN' | 'OUT'
  warehouseId: number
  transaction: Transaction
}) => {
  if (type !== 'IN' && type !== 'OUT') {
    throw ApiError.badRequest('type must be IN or OUT', { code: 'VALIDATION_ERROR' })
  }
  if (!String(barcode || '').trim()) {
    throw ApiError.badRequest('barcode is required', { code: 'VALIDATION_ERROR' })
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw ApiError.badRequest('quantity must be a positive integer', { code: 'VALIDATION_ERROR' })
  }
  const barcodeRow: any = await ProductBarcode.findOne({
    where: { barcode },
    include: [{ model: ProductVariant, required: true }],
    transaction,
    lock: transaction.LOCK.UPDATE
  })
  if (!barcodeRow) throw ApiError.notFound('Barcode not found', { code: 'NOT_FOUND' })
  const variant: any = barcodeRow.get('productVariant')
  const variantId = Number(barcodeRow.get('variantId'))
  const productId = Number(variant.get('productId'))
  const baseQuantity = quantity * Number(barcodeRow.get('conversionRate'))
  let inventory: any = await Inventory.findOne({
    where: { variantId, warehouseId },
    transaction,
    lock: transaction.LOCK.UPDATE
  })
  const current = Number(inventory?.get('quantity') ?? 0)
  const next = type === 'IN' ? current + baseQuantity : current - baseQuantity
  if (type === 'OUT' && next < 0 && !Boolean(variant.get('isNegative'))) {
    throw ApiError.badRequest(
      `Insufficient stock: ${current} base units available; requested ${quantity} × ${barcodeRow.get('conversionRate')} = ${baseQuantity}`,
      { code: 'INSUFFICIENT_STOCK' }
    )
  }
  if (inventory) await inventory.update({ quantity: next }, { transaction })
  else inventory = await Inventory.create({ productId, variantId, warehouseId, quantity: next }, { transaction })
  await Transfer.create({
    fromWarehouseId: warehouseId,
    productId,
    variantId,
    quantity: baseQuantity,
    type: type === 'IN' ? '0' : '1'
  }, { transaction })
  return { inventory, baseQuantity, quantity: next, variantId, productId }
}
