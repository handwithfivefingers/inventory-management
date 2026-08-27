'use strict'

/**
 * Creates the `sequences` table used by atomic code generation
 * (invoice numbers, staff NV-codes, product codes).
 * See src/utils/sequence.ts - the LAST_INSERT_ID() upsert trick requires
 * the unique key on (scopeKey, year).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    const exists = tables.some((t) => (typeof t === 'string' ? t : t.tableName || t.TableName || t.name) === 'sequences')
    if (!exists) {
      await queryInterface.createTable('sequences', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        scopeKey: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        year: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        seq: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
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
    }
    // Ensure unique constraint exists (idempotent)
    try {
      const desc = await queryInterface.describeTable('sequences')
      // describeTable does not show constraints, so try add and swallow duplicate
      await queryInterface.addConstraint('sequences', {
        fields: ['scopeKey', 'year'],
        type: 'unique',
        name: 'sequences_scope_year_unique'
      })
    } catch (e) {
      if (!/Duplicate|exists|already|1061/i.test(String(e?.message ?? e))) throw e
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sequences')
  }
}
