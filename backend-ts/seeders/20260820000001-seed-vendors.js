'use strict'

/**
 * Seed N vendors, all owned by the seeded user (userId -> users.id).
 * Names are prefixed with `SEED-` for clean rollback.
 */

const VENDOR_COUNT = 3
const VENDOR_NAMES = [
  'Công ty TNHH TM Minh Anh',
  'Công ty CP Phát triển Việt',
  'Nhà phân phối Hòa Phát',
  'Công ty TNHH Đại Phúc',
  'Công ty CP Thương mại Nam Anh'
]

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date()
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

    const [users] = await Promise.all([
      queryInterface.sequelize.query('SELECT id FROM users WHERE email = ?', {
        replacements: ['seed-owner@example.com'],
        type: Sequelize.QueryTypes.SELECT
      })
    ])
    const userIds = users.map((u) => u.id)
    if (!userIds.length) throw new Error('seed-vendors: run the users seeder first.')

    const rows = []
    for (let i = 0; i < VENDOR_COUNT; i++) {
      rows.push({
        id: i,
        name: `SEED-${VENDOR_NAMES[i % VENDOR_NAMES.length]}`,
        userId: 1,
        createdAt: now,
        updatedAt: now
      })
    }
    await queryInterface.bulkInsert('vendors', rows)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('vendors', { name: { [require('sequelize').Op.like]: 'SEED-%' } }, {})
  }
}
