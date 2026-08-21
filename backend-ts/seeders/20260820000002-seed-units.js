'use strict'

/**
 * Seed units of measure. Products optionally reference `unitId`, so we create
 * a small set and link them to a random vendor when available.
 * Names are prefixed with `SEED-` for clean rollback.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date()
    const pick = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null)

    const [vendors] = await Promise.all([
      queryInterface.sequelize.query('SELECT id FROM vendors', { type: Sequelize.QueryTypes.SELECT })
    ])
    const vendorIds = vendors.map((v) => v.id)

    const units = ['Cái', 'Hộp', 'Thùng', 'Chai', 'Gói', 'Kg', 'Bộ', 'Quyển', 'Chiếc', 'Túi']
    await queryInterface.bulkInsert(
      'units',
      units.map((name) => ({
        name: `SEED-${name}`,
        vendorId: pick(vendorIds),
        createdAt: now,
        updatedAt: now
      }))
    )
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'units',
      { name: { [require('sequelize').Op.like]: 'SEED-%' } },
      {}
    )
  }
}
