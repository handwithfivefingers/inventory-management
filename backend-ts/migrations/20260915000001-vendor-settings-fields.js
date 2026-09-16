'use strict'

/** @type {import('sequelize-cli').Migration} */

const columnExists = async (queryInterface, table, column) => {
  const desc = await queryInterface.describeTable(table)
  return Object.prototype.hasOwnProperty.call(desc, column)
}

const tableExists = async (queryInterface, table) => {
  try {
    await queryInterface.describeTable(table)
    return true
  } catch {
    return false
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const vendorColumns = [
      ['legal_name', { type: Sequelize.STRING, allowNull: true }],
      ['tax_number', { type: Sequelize.STRING, allowNull: true }],
      ['address', { type: Sequelize.TEXT, allowNull: true }],
      ['email', { type: Sequelize.STRING, allowNull: true }],
      ['phone', { type: Sequelize.STRING, allowNull: true }],
      ['invoice_series_prefix', { type: Sequelize.STRING(20), allowNull: true }]
    ]
    for (const [column, definition] of vendorColumns) {
      if (!(await columnExists(queryInterface, 'vendors', column))) {
        await queryInterface.addColumn('vendors', column, definition)
      }
    }

    if (!(await tableExists(queryInterface, 'vendor_histories'))) {
      await queryInterface.createTable('vendor_histories', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        vendorId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'vendors', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        changedBy: { type: Sequelize.INTEGER, allowNull: true },
        changes: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      })
      await queryInterface.addIndex('vendor_histories', ['vendorId']).catch(() => {})
    }
  },

  async down(queryInterface, Sequelize) {
    void Sequelize
    await queryInterface.dropTable('vendor_histories').catch(() => {})
    for (const column of ['invoice_series_prefix', 'phone', 'email', 'address', 'tax_number', 'legal_name']) {
      if (await columnExists(queryInterface, 'vendors', column)) {
        await queryInterface.removeColumn('vendors', column)
      }
    }
  }
}
