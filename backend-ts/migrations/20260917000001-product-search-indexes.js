'use strict'

/**
 * B-Tree indexes for the unified product query (POS & Admin) + SKU scan.
 *
 * - `productVariants(skuCode)` / `productVariants(code)`: Branch 1 exact
 *   scan match (`v.barcode = :query OR v.sku = :query`) and POS/ADMIN
 *   `LIKE %query%` fallback filters.
 * - `productVariants(productId)`: variant -> product joins and per-product
 *   variant aggregation for the Admin branch.
 * - `inventories(variantId, warehouseId)`: per-variant stock lookup scoped
 *   to the POS warehouse (real-time, never cached).
 *
 * All operations are idempotent: existing indexes are skipped on `up` and
 * only indexes created by this migration are dropped on `down`.
 */

const PRODUCT_VARIANT_INDEXES = [
  { name: 'productVariants_skuCode', fields: ['skuCode'] },
  { name: 'productVariants_code', fields: ['code'] },
  { name: 'productVariants_productId', fields: ['productId'] }
]

const INVENTORY_INDEXES = [
  { name: 'inventories_variantId_warehouseId', fields: ['variantId', 'warehouseId'] },
  { name: 'inventories_productId', fields: ['productId'] },
  { name: 'inventories_warehouseId', fields: ['warehouseId'] }
]

const hasIndex = async (queryInterface, table, name) => {
  const indexes = await queryInterface.showIndex(table)
  return indexes.some((idx) => idx.name === name || idx.indexName === name)
}

module.exports = {
  async up(queryInterface) {
    for (const { name, fields } of PRODUCT_VARIANT_INDEXES) {
      if (!(await hasIndex(queryInterface, 'productVariants', name))) {
        await queryInterface.addIndex('productVariants', fields, { name })
      }
    }
    for (const { name, fields } of INVENTORY_INDEXES) {
      if (!(await hasIndex(queryInterface, 'inventories', name))) {
        await queryInterface.addIndex('inventories', fields, { name })
      }
    }
  },

  async down(queryInterface) {
    for (const { name } of INVENTORY_INDEXES) {
      if (await hasIndex(queryInterface, 'inventories', name)) {
        await queryInterface.removeIndex('inventories', name)
      }
    }
    for (const { name } of PRODUCT_VARIANT_INDEXES) {
      if (await hasIndex(queryInterface, 'productVariants', name)) {
        await queryInterface.removeIndex('productVariants', name)
      }
    }
  }
}
