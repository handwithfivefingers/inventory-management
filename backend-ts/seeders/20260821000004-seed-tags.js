'use strict'

/**
 * Seed tags for the demo vendor (20260820000001-seed-workspace).
 * Idempotent: only inserts names missing for that vendor.
 * Fixed: previously referenced undefined `pick()`; no longer links to products.
 * Product-tag linkage is tested via API payload `tags: [id]` in ProductService.create ($set).
 * This seeder covers flow step: "Seeder should do: Create Tag to vendor".
 */

const { Op } = require('sequelize')

const TAGS = ['Hot', 'Sale', 'New', 'Best Seller', 'Premium', 'Eco']

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
      console.log('[seed-tags] no demo vendor yet, skipping')
      return
    }
    const now = new Date()
    const existing = await queryInterface.sequelize.query('SELECT name FROM tags WHERE vendorId = :vendorId', {
      replacements: { vendorId },
      type: Sequelize.QueryTypes.SELECT
    })
    const existingSet = new Set(existing.map((r) => r.name))
    const toInsert = TAGS.filter((n) => !existingSet.has(n)).map((name) => ({
      name,
      vendorId,
      createdAt: now,
      updatedAt: now
    }))
    if (toInsert.length) await queryInterface.bulkInsert('tags', toInsert)
  },

  async down(queryInterface, Sequelize) {
    const vendorId = await demoVendorId(queryInterface, Sequelize)
    if (!vendorId) return
    const res = await queryInterface.sequelize.query('SELECT id FROM tags WHERE vendorId = :vendorId AND name IN (:names)', {
      replacements: { vendorId, names: TAGS },
      type: Sequelize.QueryTypes.SELECT
    })
    const ids = res.map((r) => r.id)
    if (ids.length) {
      await queryInterface.bulkDelete('product_tags', { tagId: { [Op.in]: ids } }, {})
      await queryInterface.bulkDelete('tags', { id: { [Op.in]: ids } }, {})
    }
  }
}
