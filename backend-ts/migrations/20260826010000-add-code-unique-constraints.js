'use strict'

/**
 * Safety-net unique constraints for generated codes:
 * - staff.code (NV-xxxx) and product.code are produced by atomic counters
 *   (utils/sequence.ts); the unique index guarantees no duplicates can ever
 *   be committed even if a counter row is reset manually.
 * - invoices.invoiceNumber already carries `unique: true` in its model.
 */

const addUniqueIfMissing = async (queryInterface, table, column, constraintName) => {
  const description = await queryInterface.describeTable(table)
  if (!description[column]) return
  try {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraintName}\` UNIQUE (\`${column}\`)`
    )
  } catch (error) {
    // Duplicate name or duplicate data -> leave as-is rather than fail boot.
    if (!/Duplicate|exists|errno 1061/i.test(String(error?.message ?? error))) {
      throw error
    }
  }
}

module.exports = {
  async up(queryInterface) {
    // Table is `staff` (singular) per model tableName
    const tryStaff = async () => {
      for (const name of ['staff', 'staffs']) {
        try {
          await addUniqueIfMissing(queryInterface, name, 'code', name === 'staff' ? 'staff_code_unique' : 'staffs_code_unique')
          return
        } catch (e) {
          if (/No description|doesn't exist/i.test(String(e?.message ?? e))) continue
          throw e
        }
      }
    }
    await tryStaff()
    await addUniqueIfMissing(queryInterface, 'products', 'code', 'products_code_unique')
  },

  async down(queryInterface) {
    await queryInterface.sequelize
      .query('ALTER TABLE `staff` DROP INDEX `staff_code_unique`')
      .catch(() => {})
    await queryInterface.sequelize
      .query('ALTER TABLE `staffs` DROP INDEX `staffs_code_unique`')
      .catch(() => {})
    await queryInterface.sequelize
      .query('ALTER TABLE `products` DROP INDEX `products_code_unique`')
      .catch(() => {})
  }
}
