'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('units')
    if (!table.isDefault) {
      await queryInterface.addColumn('units', 'isDefault', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      })
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('units')
    if (indexes.some((index) => index.name === 'units_one_default_per_vendor')) {
      await queryInterface.removeIndex('units', 'units_one_default_per_vendor')
    }
    if (table.isDefault) await queryInterface.removeColumn('units', 'isDefault')
  }
}
