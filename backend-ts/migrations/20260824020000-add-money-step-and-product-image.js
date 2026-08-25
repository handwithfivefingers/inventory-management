'use strict'

/**
 * - settings.moneyStep: +/- step size for money steppers (e.g. 1000 for VND)
 * - products.image: product image URL
 *
 * Guarded so it is safe to re-run on drifted databases.
 */

const columnExists = async (queryInterface, table, column) => {
  const description = await queryInterface.describeTable(table)
  return Object.prototype.hasOwnProperty.call(description, column)
}

const addColumnIfMissing = async (queryInterface, table, column, options) => {
  if (!(await columnExists(queryInterface, table, column))) {
    await queryInterface.addColumn(table, column, options)
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnIfMissing(queryInterface, 'settings', 'moneyStep', {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: 1000
    })
    await addColumnIfMissing(queryInterface, 'products', 'image', {
      type: Sequelize.STRING,
      allowNull: true
    })
  },

  async down(queryInterface) {
    for (const [table, column] of [
      ['settings', 'moneyStep'],
      ['products', 'image']
    ]) {
      if (await columnExists(queryInterface, table, column)) {
        await queryInterface.removeColumn(table, column)
      }
    }
  }
}
