'use strict'

/**
 * Seed units of measure for vendor 4.
 * Idempotent: skips names that already exist for vendor 4.
 * These are the master records later referenced by ProductService via `unitId`.
 * Down removes only the SEED- prefix rows for vendor 4.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date()
    // Keep names aligned with scripts/mocks/vendor4.units.json (no SEED- prefix in mocks,
    // but seeded rows keep SEED- to avoid colliding with user-created units).
    const units = ['Cái', 'Hộp', 'Thùng', 'Chai', 'Gói', 'Kg']
    const existing = await queryInterface.sequelize.query('SELECT name FROM units WHERE vendorId = 4', {
      type: Sequelize.QueryTypes.SELECT
    })
    const existingSet = new Set(existing.map((r) => r.name))
    const toInsert = units
      .map((name) => `SEED-${name}`)
      .filter((n) => !existingSet.has(n))
      .map((name) => ({ name, vendorId: 4, createdAt: now, updatedAt: now }))
    if (toInsert.length) await queryInterface.bulkInsert('units', toInsert)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'units',
      { vendorId: 4, name: { [require('sequelize').Op.like]: 'SEED-%' } },
      {}
    )
  }
}
