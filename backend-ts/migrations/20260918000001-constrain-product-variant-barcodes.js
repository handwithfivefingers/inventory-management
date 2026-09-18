'use strict'

/**
 * Product variant barcodes are alphanumeric/hyphen strings with a maximum of 12
 * characters. Automatically generated values are numeric at the service layer.
 * Existing invalid rows are reported instead of being silently truncated.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [invalidRows] = await queryInterface.sequelize.query(
      `SELECT id FROM productVariants
       WHERE code IS NOT NULL AND (code = '' OR code NOT REGEXP '^[A-Za-z0-9-]{1,12}$')
       LIMIT 10`
    )
    if (invalidRows.length) {
      const ids = invalidRows.map((row) => row.id).join(', ')
      throw new Error(`Cannot constrain productVariants.code; invalid barcode rows: ${ids}`)
    }

    await queryInterface.changeColumn('productVariants', 'code', {
      type: Sequelize.STRING(12),
      allowNull: true
    })
    await queryInterface.addConstraint('productVariants', {
      fields: ['code'],
      type: 'check',
      name: 'productVariants_code_numeric_max_12',
      where: Sequelize.literal("code IS NULL OR code REGEXP '^[A-Za-z0-9-]{1,12}$'")
    })
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('productVariants', 'productVariants_code_numeric_max_12')
    await queryInterface.changeColumn('productVariants', 'code', {
      type: 'VARCHAR(255)',
      allowNull: true
    })
  }
}
