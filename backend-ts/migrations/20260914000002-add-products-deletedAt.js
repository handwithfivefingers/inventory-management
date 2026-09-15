'use strict'

/**
 * Paranoid soft-delete for products + variants.
 * - Adds `deletedAt` to `products` and `productVariants` (Sequelize paranoid).
 * - DELETE keeps orders / inventories / transfers / stocktakes / finance.
 * - Transfers + stocktakeDetails FK to product: CASCADE -> NO ACTION so a
 *   future force-purge cannot wipe audit history.
 */

const columnExists = async (queryInterface, table, column) => {
  const desc = await queryInterface.describeTable(table)
  return Object.prototype.hasOwnProperty.call(desc, column)
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'products', 'deletedAt'))) {
      await queryInterface.addColumn('products', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      })
    }
    if (!(await columnExists(queryInterface, 'productVariants', 'deletedAt'))) {
      await queryInterface.addColumn('productVariants', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      })
    }
    // Best-effort FK relax; ignore when constraint names differ per env.
    try {
      const [rows] = await queryInterface.sequelize.query(
        "SELECT CONSTRAINT_NAME AS name FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transfers' AND REFERENCED_TABLE_NAME = 'products'"
      )
      for (const r of rows || []) {
        try {
          await queryInterface.sequelize.query(
            `ALTER TABLE \`transfers\` DROP FOREIGN KEY \`${r.name}\``
          )
          await queryInterface.sequelize.query(
            'ALTER TABLE `transfers` ADD CONSTRAINT `transfers_ibfk_products` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION'
          )
          break
        } catch {}
      }
    } catch {}
    try {
      const [rows] = await queryInterface.sequelize.query(
        "SELECT CONSTRAINT_NAME AS name FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stocktake_details' AND REFERENCED_TABLE_NAME = 'products'"
      )
      for (const r of rows || []) {
        try {
          await queryInterface.sequelize.query(
            `ALTER TABLE \`stocktake_details\` DROP FOREIGN KEY \`${r.name}\``
          )
          await queryInterface.sequelize.query(
            'ALTER TABLE `stocktake_details` ADD CONSTRAINT `stocktake_details_ibfk_products` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION'
          )
          break
        } catch {}
      }
    } catch {}
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, 'products', 'deletedAt')) {
      await queryInterface.removeColumn('products', 'deletedAt')
    }
    if (await columnExists(queryInterface, 'productVariants', 'deletedAt')) {
      await queryInterface.removeColumn('productVariants', 'deletedAt')
    }
  }
}
