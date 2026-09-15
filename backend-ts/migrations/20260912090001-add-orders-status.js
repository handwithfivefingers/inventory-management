'use strict'

/**
 * Adds `orders.status` ENUM (draft|completed|partially_returned|returned).
 * Existing rows keep their semantics: every pre-return order is 'completed'.
 * Dev environments already have this column via sequelize auto-sync; the
 * migration makes the change explicit for staging/production.
 */

/** @type {import('sequelize-cli').Migration} */
const columnExists = async (queryInterface, table, column) => {
  const desc = await queryInterface.describeTable(table)
  return Object.prototype.hasOwnProperty.call(desc, column)
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'orders', 'status'))) {
      await queryInterface.addColumn('orders', 'status', {
        type: Sequelize.ENUM('draft', 'completed', 'partially_returned', 'returned'),
        allowNull: false,
        defaultValue: 'completed',
        comment: 'lifecycle: completed = normal sale; partially_returned/returned set by return documents'
      })
    }
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, 'orders', 'status')) {
      await queryInterface.removeColumn('orders', 'status')
    }
  }
}
