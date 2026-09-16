import Inventory from '#/database/models/inventory'
import Transfer from '#/database/models/transfer'
import { Transaction } from 'sequelize'

export interface AdjustStockParams {
  productId: number
  /** Pass null for the simple-product (no-variant) inventory row. */
  variantId: number | string | null
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

  const row: any = await Inventory.findOne({ where: { productId, variantId, warehouseId }, transaction })
  const current = Number(row?.get('quantity') ?? 0)
  const delta = target - current

  if (row) {
    await row.update({ quantity: target }, { transaction })
  } else if (target !== 0) {
    await Inventory.build({ warehouseId, quantity: target, productId, variantId: variantId ?? undefined }).save({
      transaction
    })
  }

  if (delta !== 0) {
    await Transfer.build({
      fromWarehouseId: warehouseId,
      quantity: Math.abs(delta),
      productId,
      variantId: variantId ?? undefined,
      type: delta > 0 ? '0' : '1'
    }).save({ transaction })
  }
}

export interface CreateOpeningStockParams {
  productId: number
  variantId?: number | string | null
  warehouseId: number
  quantity: number
  transaction?: Transaction
}

/**
 * Create the opening Inventory + Transfer('0') pair for a brand-new
 * product/variant. No-op (returns null) when quantity is 0 — nothing to record.
 */
export const createOpeningStock = async ({
  productId,
  variantId,
  warehouseId,
  quantity,
  transaction
}: CreateOpeningStockParams) => {
  if (!quantity) return null

  const inventory: any = await Inventory.build({
    warehouseId,
    quantity,
    productId,
    variantId: variantId ?? undefined
  }).save({ transaction })

  const transfer: any = await Transfer.build({
    fromWarehouseId: warehouseId,
    quantity,
    productId,
    variantId: variantId ?? undefined,
    type: '0'
  }).save({ transaction })

  return { inventory, transfer }
}
