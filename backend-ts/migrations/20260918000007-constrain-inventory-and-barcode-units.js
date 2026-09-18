'use strict'

/* Keep stock one-row-per-variant/warehouse and infer the single base unit from
 * conversionRate = 1.  MySQL UNIQUE permits multiple NULLs, which gives us the
 * equivalent of a partial unique index for the generated column. */
module.exports = {
  async up(queryInterface) {
    // Inventory rows are an accumulator, so duplicate legacy rows can be
    // safely folded into the oldest row before adding the uniqueness rule.
    await queryInterface.sequelize.query(
      `UPDATE inventories i JOIN (
         SELECT MIN(id) AS keepId, variantId, warehouseId, SUM(quantity) AS total
         FROM inventories GROUP BY variantId, warehouseId HAVING COUNT(*) > 1
       ) d ON i.id = d.keepId SET i.quantity = d.total`
    )
    await queryInterface.sequelize.query(
      `DELETE i FROM inventories i JOIN (
         SELECT MIN(id) AS keepId, variantId, warehouseId
         FROM inventories GROUP BY variantId, warehouseId HAVING COUNT(*) > 1
       ) d ON i.variantId = d.variantId AND i.warehouseId = d.warehouseId AND i.id <> d.keepId`
    )

    // Barcode rows may be referenced by order details. Do not silently merge
    // them: stop with actionable ids so an operator can choose the canonical
    // unit/barcode before applying the irreversible constraint.
    const [duplicateUnits] = await queryInterface.sequelize.query(
      `SELECT variantId, unitId, GROUP_CONCAT(id ORDER BY id) AS ids
       FROM product_barcodes GROUP BY variantId, unitId HAVING COUNT(*) > 1 LIMIT 10`
    )
    const [duplicateBases] = await queryInterface.sequelize.query(
      `SELECT variantId, GROUP_CONCAT(id ORDER BY id) AS ids
       FROM product_barcodes WHERE conversionRate = 1 GROUP BY variantId HAVING COUNT(*) > 1 LIMIT 10`
    )
    if (duplicateUnits.length || duplicateBases.length) {
      throw new Error(`Cannot add barcode constraints; duplicate unit rows: ${JSON.stringify(duplicateUnits)}, duplicate base rows: ${JSON.stringify(duplicateBases)}`)
    }
    const inventoryIndexes = await queryInterface.showIndex('inventories')
    if (!inventoryIndexes.some((index) => index.name === 'inventories_variant_warehouse_unique')) {
      await queryInterface.addIndex('inventories', ['variantId', 'warehouseId'], {
        unique: true,
        name: 'inventories_variant_warehouse_unique'
      })
    }

    const barcodeIndexes = await queryInterface.showIndex('product_barcodes')
    if (!barcodeIndexes.some((index) => index.name === 'product_barcodes_variant_unit_unique')) {
      await queryInterface.addIndex('product_barcodes', ['variantId', 'unitId'], {
        unique: true,
        name: 'product_barcodes_variant_unit_unique'
      })
    }
    const columns = await queryInterface.describeTable('product_barcodes')
    if (!columns.baseConversionVariantId) {
      await queryInterface.sequelize.query(
        'ALTER TABLE `product_barcodes` ADD COLUMN `baseConversionVariantId` INT GENERATED ALWAYS AS (CASE WHEN `conversionRate` = 1 THEN `variantId` ELSE NULL END) STORED'
      )
    }
    const refreshedIndexes = await queryInterface.showIndex('product_barcodes')
    if (!refreshedIndexes.some((index) => index.name === 'product_barcodes_one_rate_one_per_variant')) {
      await queryInterface.addIndex('product_barcodes', ['baseConversionVariantId'], {
        unique: true,
        name: 'product_barcodes_one_rate_one_per_variant'
      })
    }
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('inventories', 'inventories_variant_warehouse_unique')
    await queryInterface.removeIndex('product_barcodes', 'product_barcodes_variant_unit_unique')
    await queryInterface.removeIndex('product_barcodes', 'product_barcodes_one_rate_one_per_variant')
    await queryInterface.removeColumn('product_barcodes', 'baseConversionVariantId')
  }
}
