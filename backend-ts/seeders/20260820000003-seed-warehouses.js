'use strict'

/**
 * Seed warehouses as children of vendors: WAREHOUSES_PER_VENDOR warehouses for
 * each seeded vendor (so each vendor owns multiple warehouses). Every warehouse
 * carries its parent vendor's id via `vendorId`.
 * Names are prefixed with `SEED-` for clean rollback.
 */

const WAREHOUSES_PER_VENDOR = 2
const CITIES = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng', 'Biên Hòa']

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date()
    const vendors = await queryInterface.sequelize.query(
      "SELECT id FROM vendors WHERE name LIKE 'SEED-%'",
      { type: Sequelize.QueryTypes.SELECT }
    )
    if (!vendors.length) throw new Error('seed-warehouses: run the vendors seeder first.')

    const rows = []
    let c = 0
    for (const v of vendors) {
      for (let i = 0; i < WAREHOUSES_PER_VENDOR; i++) {
        const city = CITIES[c % CITIES.length]
        rows.push({
          name: `SEED-Kho ${city} #${i + 1}`,
          address: city,
          phone: '090' + Math.floor(1000000 + Math.random() * 8999999),
          email: `kho${c}@example.com`,
          isMain: i === 0,
          vendorId: v.id,
          createdAt: now,
          updatedAt: now
        })
        c++
      }
    }
    await queryInterface.bulkInsert('warehouses', rows)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'warehouses',
      { name: { [require('sequelize').Op.like]: 'SEED-%' } },
      {}
    )
  }
}
