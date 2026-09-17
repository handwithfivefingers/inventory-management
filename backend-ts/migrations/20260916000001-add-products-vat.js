'use strict'

/**
 * Adds `VAT` (percent, e.g. 0/5/8/10) to `products` and `productVariants`.
 *
 * The client product form already sends `VAT` but the backend had no column,
 * so the value was silently dropped by Sequelize. Variant-level `VAT` acts as
 * an override; NULL falls back to the parent product `VAT`.
 */

const columnExists = async (queryInterface, table, column) => {
  const desc = await queryInterface.describeTable(table)
  return Object.prototype.hasOwnProperty.call(desc, column)
}

const VAT_DEFINITION = (Sequelize) => ({
  type: Sequelize.INTEGER,
  allowNull: true,
  defaultValue: 0,
  comment: 'VAT percent, e.g. 0/5/8/10'
})

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'products', 'VAT'))) {
      await queryInterface.addColumn('products', 'VAT', VAT_DEFINITION(Sequelize))
    }
    if (!(await columnExists(queryInterface, 'productVariants', 'VAT'))) {
      await queryInterface.addColumn('productVariants', 'VAT', VAT_DEFINITION(Sequelize))
    }
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, 'productVariants', 'VAT')) {
      await queryInterface.removeColumn('productVariants', 'VAT')
    }
    if (await columnExists(queryInterface, 'products', 'VAT')) {
      await queryInterface.removeColumn('products', 'VAT')
    }
  }
}
