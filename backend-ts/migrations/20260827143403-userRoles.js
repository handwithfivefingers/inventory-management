'use strict'

const METHODS = ['CREATE', 'READ', 'UPDATE', 'DELETE']
const MODULES = [
  'dashboard',
  'order',
  'product',
  'customer',
  'invoice',
  'provider',
  'import-order',
  'warehouse',
  'category',
  'unit',
  'tag',
  'financial',
  'staff',
  'shift',
  'setting',
  'role'
]
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columnExists = async (queryInterface, table, column) => {
      try {
        const desc = await queryInterface.describeTable(table)
        return Object.prototype.hasOwnProperty.call(desc, column)
      } catch {
        return false
      }
    }
    const tableExists = async (queryInterface, tableName) => {
      try {
        const tables = await queryInterface.showAllTables()
        return tables.some((t) => (typeof t === 'string' ? t : t.tableName || t.name) === tableName)
      } catch {
        return false
      }
    }
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    if (await tableExists(queryInterface, 'user_roles')) {
      queryInterface.dropTable('user_roles')
    }
    if (await tableExists(queryInterface, 'role_permissions')) {
      if (await columnExists(queryInterface, 'role_permissions', 'C')) {
        await queryInterface.removeColumn('role_permissions', 'C')
      }
      if (await columnExists(queryInterface, 'role_permissions', 'R')) {
        await queryInterface.removeColumn('role_permissions', 'R')
      }
      if (await columnExists(queryInterface, 'role_permissions', 'U')) {
        await queryInterface.removeColumn('role_permissions', 'U')
      }
      if (await columnExists(queryInterface, 'role_permissions', 'D')) {
        await queryInterface.removeColumn('role_permissions', 'D')
      }
      const now = new Date()

      try {
        if (await tableExists(queryInterface, 'permissions')) {
          if (!(await columnExists(queryInterface, 'permissions', 'method'))) {
            await queryInterface.addColumn('permissions', 'method', {
              type: Sequelize.ENUM('CREATE', 'READ', 'UPDATE', 'DELETE'),
              allowNull: false,
              defaultValue: 'READ'
            })
          }
          for (const module of MODULES) {
            for (const m of METHODS) {
              await queryInterface.sequelize
                .query(
                  'INSERT IGNORE INTO `permissions` (`name`,`description`,`method`,`createdAt`,`updatedAt`) VALUES (:name,:description,:method,:createdAt,:updatedAt)',
                  {
                    replacements: { name: module, description: null, method: m, createdAt: now, updatedAt: now },
                  }
                )
                .catch(() => {});
            }
          }
        }
      } catch (error) {
        console.log('error', error)
      }
    }
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
}
