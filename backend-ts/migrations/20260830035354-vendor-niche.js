'use strict'

/** @type {import('sequelize-cli').Migration} */

const columnExists = async (queryInterface, table, column) => {
  const desc = await queryInterface.describeTable(table)
  return Object.prototype.hasOwnProperty.call(desc, column)
}
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'vendors', 'niche'))) {
      await queryInterface.addColumn('vendors', 'niche', {
        type: Sequelize.STRING,
        allowNull: true,
        default: 'other'
      })
    }
  },

  async down(queryInterface, Sequelize) {
    if (await columnExists(queryInterface, 'vendors', 'niche')) {
      await queryInterface.removeColumn('vendors', 'niche')
    }
  }
}
