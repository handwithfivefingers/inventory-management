'use strict'

/**
 * Seed providers as children of vendors: each provider is assigned to the demo
 * vendor (see 20260820000001-seed-workspace), so the workspace has its own
 * suppliers. Orders later pick a provider belonging to the same vendor as
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
      console.log('[seed-providers] no demo vendor yet, skipping')
      return
    }
    const now = new Date()
    const existing = await queryInterface.sequelize.query(
      'SELECT name FROM providers WHERE vendorId = :vendorId',
      { replacements: { vendorId }, type: Sequelize.QueryTypes.SELECT }
    )
    const existingSet = new Set(existing.map((r) => r.name))
    const toInsert = PROVIDERS.map((p, i) => ({
      name: `SEED-${p.name}`,
      description: p.description,
      phone: '090' + Math.floor(1000000 + Math.random() * 8999999),
      address: p.address,
      email: `provider${i}@example.com`,
      vendorId,
      createdAt: now,
      updatedAt: now
    })).filter((row) => !existingSet.has(row.name))
    if (toInsert.length) await queryInterface.bulkInsert('providers', toInsert)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('providers', { name: { [require('sequelize').Op.like]: 'SEED-%' } }, {})
  }
}
