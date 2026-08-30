'use strict'

/** @type {import('sequelize-cli').Migration} */
const columnExists = async (queryInterface, table, column) => {
  const desc = await queryInterface.describeTable(table)
  return Object.prototype.hasOwnProperty.call(desc, column)
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'orders', 'staffId'))) {
      await queryInterface.addColumn('orders', 'staffId', {
        type: Sequelize.INTEGER,
        allowNull: true
      })
    }
    if (!(await columnExists(queryInterface, 'orders', 'customerId'))) {
      await queryInterface.addColumn('orders', 'customerId', {
        type: Sequelize.INTEGER,
        allowNull: true
      })
    }
  },

  async down(queryInterface, Sequelize) {
    if (await columnExists(queryInterface, 'orders', 'staffId')) {
      await queryInterface.removeColumn('orders', 'staffId')
    }
    if (await columnExists(queryInterface, 'orders', 'customerId')) {
      await queryInterface.removeColumn('orders', 'customerId')
    }
  }
}
