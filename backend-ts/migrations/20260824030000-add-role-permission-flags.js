'use strict'

/**
 * Hybrid RBAC: move C/R/U/D flags from `permissions` catalog onto the
 * `role_permissions` join. This migration makes the schema change explicit
 * so `sequelize db:migrate` can bring a fresh or drifted DB up to date
 * without relying on sync({alter:true}).
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
    for (const col of ['C', 'R', 'U', 'D']) {
      await addColumnIfMissing(queryInterface, 'role_permissions', col, {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      })
    }
  },

  async down(queryInterface) {
    for (const col of ['C', 'R', 'U', 'D']) {
      if (await columnExists(queryInterface, 'role_permissions', col)) {
        await queryInterface.removeColumn('role_permissions', col)
      }
    }
  }
}
