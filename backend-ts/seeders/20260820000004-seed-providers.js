'use strict'

/**
 * Seed providers as children of vendors: each provider is assigned to a vendor
 * (vendorId), round-robin across the seeded vendors, so every vendor has its
 * own suppliers. Orders later pick a provider belonging to the same vendor as
 * the order's warehouse.
 * Names are prefixed with `SEED-` for clean rollback.
 */

const PROVIDERS = [
  { name: 'Thực phẩm An Khang', description: 'Thực phẩm & đồ uống', address: 'Hà Nội' },
  { name: 'Thiết bị điện Việt', description: 'Thiết bị điện tử', address: 'Bắc Ninh' },
  { name: 'Hóa mỹ phẩm Nam', description: 'Mỹ phẩm & vệ sinh', address: 'TP.HCM' },
  { name: 'Văn phòng phẩm Hòa Bình', description: 'Văn phòng phẩm', address: 'Hải Phòng' },
  { name: 'Gia dụng Tiến Phát', description: 'Đồ gia dụng', address: 'Đồng Nai' },
  { name: 'Nông sản Mekong', description: 'Nông sản & thực phẩm', address: 'Cần Thơ' }
]

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date()
    const vendors = await queryInterface.sequelize.query("SELECT id FROM vendors WHERE name LIKE 'SEED-%'", {
      type: Sequelize.QueryTypes.SELECT
    })
    if (!vendors.length) throw new Error('seed-providers: run the vendors seeder first.')

    const rows = PROVIDERS.map((p, i) => ({
      name: `SEED-${p.name}`,
      description: p.description,
      phone: '090' + Math.floor(1000000 + Math.random() * 8999999),
      address: p.address,
      email: `provider${i}@example.com`,
      // vendorId: vendors[i % vendors.length].id,
      vendorId: 1,
      createdAt: now,
      updatedAt: now
    }))
    await queryInterface.bulkInsert('providers', rows)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('providers', { name: { [require('sequelize').Op.like]: 'SEED-%' } }, {})
  }
}
