'use strict'

/**
 * Seed categories for the demo vendor (20260820000001-seed-workspace).
 * Idempotent: only inserts names missing for that vendor.
 * No longer links to products — products are created via API (ProductService.create)
 * so category linkage is tested through the `categories: [id]` payload (via $set).
 * This seeder covers flow step: "Seeder should do: Create Category to vendor".
 */

const { Op } = require('sequelize')

// Align with scripts/mocks/vendor4.categories.json (6 categories)
const CATEGORIES = ['Đồ Uống', 'Thực Phẩm', 'Điện Tử', 'Văn Phòng Phẩm', 'Gia Dụng', 'Best Seller']

const DEMO_VENDOR_EMAIL = 'seed-staff@example.com'

const demoVendorId = async (queryInterface, Sequelize) => {
  const rows = await queryInterface.sequelize.query(
    'SELECT v.id FROM vendors v INNER JOIN users u ON u.id = v.userId WHERE u.email = :email LIMIT 1',
    { replacements: { email: DEMO_VENDOR_EMAIL }, type: Sequelize.QueryTypes.SELECT }
  )
  return rows.length ? rows[0].id : null
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const vendorId = await demoVendorId(queryInterface, Sequelize)
    if (!vendorId) {
      console.log('[seed-categories] no demo vendor yet, skipping')
      return
    }
    const now = new Date()
    const existing = await queryInterface.sequelize.query('SELECT name FROM categories WHERE vendorId = :vendorId', {
      replacements: { vendorId },
      type: Sequelize.QueryTypes.SELECT
    })
    const existingSet = new Set(existing.map((r) => r.name))
    const toInsert = CATEGORIES.filter((n) => !existingSet.has(n)).map((name) => ({
      name,
      vendorId,
      createdAt: now,
      updatedAt: now
    }))
    if (toInsert.length) await queryInterface.bulkInsert('categories', toInsert)
  },

  async down(queryInterface, Sequelize) {
    const vendorId = await demoVendorId(queryInterface, Sequelize)
    if (!vendorId) return
    const res = await queryInterface.sequelize.query(
      'SELECT id FROM categories WHERE vendorId = :vendorId AND name IN (:names)',
      {
        replacements: { vendorId, names: CATEGORIES },
        type: Sequelize.QueryTypes.SELECT
      }
    )
    const ids = res.map((r) => r.id)
    if (ids.length) {
      await queryInterface.bulkDelete('product_categories', { categoryId: { [Op.in]: ids } }, {})
      await queryInterface.bulkDelete('categories', { id: { [Op.in]: ids } }, {})
    }
  }
}
