'use strict'

/** Base-unit status is inferred from product_barcodes.conversionRate = 1. */
module.exports = {
  async up(queryInterface) {
    const indexes = await queryInterface.showIndex('product_barcodes')
    if (indexes.some((index) => index.name === 'product_barcodes_one_base_per_variant')) {
      await queryInterface.removeIndex('product_barcodes', 'product_barcodes_one_base_per_variant')
    }
    const table = await queryInterface.describeTable('product_barcodes')
    if (table.baseVariantId) await queryInterface.removeColumn('product_barcodes', 'baseVariantId')
    if (table.isBaseUnit) await queryInterface.removeColumn('product_barcodes', 'isBaseUnit')
  },

  async down() {
    throw new Error('Irreversible migration: restore from a database backup instead.')
  }
}
