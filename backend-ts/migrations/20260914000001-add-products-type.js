'use strict'

/**
 * Adds `products.type` (0 = simple, 1 = variant, 2 = combo) for the unified
 * update flow: PUT /products/:id branches on type instead of separate
 * variant sync/update/delete endpoints. Existing rows keep type 0 unless
 * they already own variants, in which case they are backfilled to 1.
 */

const columnExists = async (queryInterface, table, column) => {
  const desc = await queryInterface.describeTable(table)
  return Object.prototype.hasOwnProperty.call(desc, column)
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'products', 'type'))) {
      await queryInterface.addColumn('products', 'type', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '0 = simple, 1 = variant, 2 = combo'
      })
    }
    await queryInterface.sequelize.query(
      'UPDATE products p SET p.type = 1 WHERE p.type = 0 AND EXISTS (SELECT 1 FROM productVariants v WHERE v.productId = p.id LIMIT 1)'
    )
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, 'products', 'type')) {
      await queryInterface.removeColumn('products', 'type')
    }
  }
}
