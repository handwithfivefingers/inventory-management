'use strict'

/**
 * Creates `stocktakes` + `stocktake_details` for the stocktake (đồng kiểm)
 * feature. A session snapshots expected quantities from `inventories` at
 * start; counted variances are applied as corrective transfers on complete.
 */

/** @type {import('sequelize-cli').Migration} */
const tableExists = async (queryInterface, table) => {
  const tables = await queryInterface.showAllTables()
  return tables.some((t) => String(t).replace(/^`.*`$/, '') === table)
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'stocktakes'))) {
      await queryInterface.createTable('stocktakes', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        code: {
          type: Sequelize.STRING,
          allowNull: false
        },
        warehouseId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'warehouses', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        vendorId: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        staffId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'staff', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        status: {
          type: Sequelize.ENUM('open', 'completed', 'cancelled'),
          allowNull: false,
          defaultValue: 'open'
        },
        note: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        completedAt: {
          type: Sequelize.DATE,
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
      await queryInterface.addIndex('stocktakes', ['warehouseId', 'status'])
      await queryInterface.addIndex('stocktakes', ['vendorId'])
    }

    if (!(await tableExists(queryInterface, 'stocktake_details'))) {
      await queryInterface.createTable('stocktake_details', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        stocktakeId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'stocktakes', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        productId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        variantId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'productVariants', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        expectedQuantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        actualQuantity: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        note: {
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
      await queryInterface.addIndex('stocktake_details', ['stocktakeId'])
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'stocktake_details')) {
      await queryInterface.dropTable('stocktake_details')
    }
    if (await tableExists(queryInterface, 'stocktakes')) {
      await queryInterface.dropTable('stocktakes')
    }
  }
}
