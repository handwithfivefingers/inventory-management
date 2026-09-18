'use strict'

/**
 * Shared fallback selling unit for automatically generated base barcodes.
 * `vendorId = NULL` marks this as a system row available to every tenant.
 */
module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      "SELECT id FROM units WHERE vendorId IS NULL AND name = 'Base unit' ORDER BY id ASC LIMIT 1"
    )
    if (existing.length) return

    await queryInterface.bulkInsert('units', [
      { name: 'Base unit', vendorId: null, createdAt: new Date(), updatedAt: new Date() }
    ])
  },

  async down() {
    throw new Error('Irreversible migration: the global Base unit may be referenced by product barcodes.')
  }
}
