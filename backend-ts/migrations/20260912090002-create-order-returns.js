'use strict'

/**
 * Creates `order_returns` - one immutable document per return event on a sale
 * order. Returned lines are snapshotted in `items` (JSON text) so the record
 * stays accurate even if the order is edited later. Money refund is booked
 * separately as a FinancialRecord (expense) by the service layer.
 */

/** @type {import('sequelize-cli').Migration} */
const tableExists = async (queryInterface, table) => {
  const tables = await queryInterface.showAllTables()
  return tables.some((t) => String(t).replace(/^`.*`$/, '') === table)
}

const columnExists = async (queryInterface, table, column) => {
  const desc = await queryInterface.describeTable(table)
  return Object.prototype.hasOwnProperty.call(desc, column)
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'order_returns'))) {
      await queryInterface.createTable('order_returns', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        code: {
          type: Sequelize.STRING,
          allowNull: false
        },
        orderId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'orders', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        warehouseId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'warehouses', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        staffId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'staff', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        vendorId: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        items: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        refundAmount: {
          type: Sequelize.BIGINT,
          allowNull: false,
          defaultValue: 0
        },
        reason: {
          type: Sequelize.STRING,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      })
      await queryInterface.addIndex('order_returns', ['orderId'])
      await queryInterface.addIndex('order_returns', ['vendorId'])
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'order_returns')) {
      await queryInterface.dropTable('order_returns')
    }
  }
}
