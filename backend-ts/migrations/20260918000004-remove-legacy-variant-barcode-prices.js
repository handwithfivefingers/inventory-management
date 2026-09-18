'use strict'

/**
 * This is deliberately forward-only.  00002 copied legacy variant values to
 * product_barcodes and 00003 snapshots old sales; this migration is the
 * point at which product_barcodes becomes the only pricing/barcode source.
 */
module.exports = {
  async up(queryInterface) {
    const [invalid] = await queryInterface.sequelize.query(
      `SELECT pv.id
       FROM productVariants pv
       LEFT JOIN product_barcodes pb ON pb.variantId = pv.id AND pb.isBaseUnit = true
       WHERE pv.deletedAt IS NULL
       GROUP BY pv.id
       HAVING COUNT(pb.id) <> 1
       LIMIT 20`
    )
    if (invalid.length) {
      throw new Error(`Cannot remove legacy variant pricing: every active variant needs exactly one base barcode (${invalid.map((r) => r.id).join(', ')})`)
    }

    // Names differ between schemas created by sequelize sync and migrations.
    // Dropping by discovered name keeps this safe for both.
    const [indexes] = await queryInterface.sequelize.query("SHOW INDEX FROM `productVariants`")
    const names = [...new Set(indexes.filter((row) => row.Column_name === 'code').map((row) => row.Key_name))]
    for (const name of names) await queryInterface.removeIndex('productVariants', name)

    const table = await queryInterface.describeTable('productVariants')
    for (const column of ['code', 'salePrice', 'regularPrice', 'wholeSalePrice', 'costPrice']) {
      if (table[column]) await queryInterface.removeColumn('productVariants', column)
    }
  },

  async down() {
    throw new Error('Irreversible migration: restore from a database backup instead.')
  }
}
