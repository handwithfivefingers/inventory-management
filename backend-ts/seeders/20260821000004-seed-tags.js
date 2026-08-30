'use strict'

/**
 * Seed tags for vendor 4.
 * Idempotent: only inserts names missing for vendor 4.
 * Fixed: previously referenced undefined `pick()`; no longer links to products.
 * Product-tag linkage is tested via API payload `tags: [id]` in ProductService.create ($set).
 * This seeder covers flow step: "Seeder should do: Create Tag to vendor".
 */

const { Op } = require('sequelize')

const TAGS = ['Hot', 'Sale', 'New', 'Best Seller', 'Premium', 'Eco']

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date()
    const existing = await queryInterface.sequelize.query('SELECT name FROM tags WHERE vendorId = 4', {
      type: Sequelize.QueryTypes.SELECT
    })
    const existingSet = new Set(existing.map((r) => r.name))
    const toInsert = TAGS.filter((n) => !existingSet.has(n)).map((name) => ({
      name,
      vendorId: 4,
      createdAt: now,
      updatedAt: now
    }))
    if (toInsert.length) await queryInterface.bulkInsert('tags', toInsert)
  },

  async down(queryInterface, Sequelize) {
    const res = await queryInterface.sequelize.query('SELECT id FROM tags WHERE vendorId = 4 AND name IN (?)', {
      replacements: [TAGS],
      type: Sequelize.QueryTypes.SELECT
    })
    const ids = res.map((r) => r.id)
    if (ids.length) {
      await queryInterface.bulkDelete('product_tags', { tagId: { [Op.in]: ids } }, {})
      await queryInterface.bulkDelete('tags', { id: { [Op.in]: ids } }, {})
    }
  }
}
