'use strict'

/**
 * Seed categories for vendor 4.
 * Idempotent: only inserts names missing for vendor 4.
 * No longer links to products — products are created via API (ProductService.create)
 * so category linkage is tested through the `categories: [id]` payload (via $set).
 * This seeder covers flow step: "Seeder should do: Create Category to vendor".
 */

const { Op } = require('sequelize')

// Align with scripts/mocks/vendor4.categories.json (6 categories)
const CATEGORIES = ['Đồ Uống', 'Thực Phẩm', 'Điện Tử', 'Văn Phòng Phẩm', 'Gia Dụng', 'Best Seller']

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date()
    const existing = await queryInterface.sequelize.query('SELECT name FROM categories WHERE vendorId = 4', {
      type: Sequelize.QueryTypes.SELECT
    })
    const existingSet = new Set(existing.map((r) => r.name))
    const toInsert = CATEGORIES.filter((n) => !existingSet.has(n)).map((name) => ({
      name,
      vendorId: 4,
      createdAt: now,
      updatedAt: now
    }))
    if (toInsert.length) await queryInterface.bulkInsert('categories', toInsert)
  },

  async down(queryInterface, Sequelize) {
    const res = await queryInterface.sequelize.query('SELECT id FROM categories WHERE vendorId = 4 AND name IN (?)', {
      replacements: [CATEGORIES],
      type: Sequelize.QueryTypes.SELECT
    })
    const ids = res.map((r) => r.id)
    if (ids.length) {
      await queryInterface.bulkDelete('product_categories', { categoryId: { [Op.in]: ids } }, {})
      await queryInterface.bulkDelete('categories', { id: { [Op.in]: ids } }, {})
    }
  }
}
