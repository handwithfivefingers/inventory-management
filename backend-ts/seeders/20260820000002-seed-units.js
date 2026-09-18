'use strict'

/**
 * Seed units of measure for the demo vendor (20260820000001-seed-workspace).
 * Idempotent: skips names that already exist for that vendor.
 * These are the master records later referenced by ProductService via `unitId`.
 * Down removes only the SEED- prefix rows for the demo vendor.
 */

const demoVendorId = async (queryInterface, Sequelize) => {
  const rows = await queryInterface.sequelize.query(
    'SELECT v.id FROM vendors v INNER JOIN users u ON u.id = v.userId WHERE u.email = :email LIMIT 1',
    { replacements: { email: 'seed-staff@example.com' }, type: Sequelize.QueryTypes.SELECT }
  )
  return rows.length ? rows[0].id : null
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const vendorId = await demoVendorId(queryInterface, Sequelize)
    if (!vendorId) {
      console.log('[seed-units] no demo vendor yet, skipping')
      return
    }
    const now = new Date()
    // Keep names aligned with scripts/mocks/vendor4.units.json (no SEED- prefix in mocks,
    // but seeded rows keep SEED- to avoid colliding with user-created units).
    const units = ['Cái', 'Hộp', 'Thùng', 'Chai', 'Gói', 'Kg']
    const existing = await queryInterface.sequelize.query('SELECT name FROM units WHERE vendorId = :vendorId', {
      replacements: { vendorId },
      type: Sequelize.QueryTypes.SELECT
    })
    const existingSet = new Set(existing.map((r) => r.name))
    const toInsert = units
      .map((name) => `SEED-${name}`)
      .filter((n) => !existingSet.has(n))
      .map((name) => ({ name, vendorId, createdAt: now, updatedAt: now }))
    if (toInsert.length) await queryInterface.bulkInsert('units', toInsert)
  },

  async down(queryInterface, Sequelize) {
    const vendorId = await demoVendorId(queryInterface, Sequelize)
    if (!vendorId) return
    await queryInterface.bulkDelete(
      'units',
      { vendorId, name: { [require('sequelize').Op.like]: 'SEED-%' } },
      {}
    )
  }
}
