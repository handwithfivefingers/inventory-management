'use strict'

/**
 * Seed tags and link them to the seeded products (each product gets 1-3 tags).
 */

const { Op } = require('sequelize')

const TAGS = ['Hot', 'Sale', 'New', 'Imported', 'Best Seller', 'Limited', 'Premium', 'Eco', 'Clearance', 'Trending']

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date()
    const pick = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null)

    const [vendors] = await Promise.all([
      queryInterface.sequelize.query('SELECT id FROM vendors', { type: Sequelize.QueryTypes.SELECT })
    ])
    const vendorIds = vendors.map((v) => v.id)

    await queryInterface.bulkInsert(
      'tags',
      TAGS.map((name) => ({ name, vendorId: pick(vendorIds), createdAt: now, updatedAt: now }))
    )

    const inserted = await queryInterface.sequelize.query('SELECT id, name FROM tags WHERE name IN (?)', {
      replacements: [TAGS],
      type: Sequelize.QueryTypes.SELECT
    })
    const tagByName = {}
    inserted.forEach((t) => (tagByName[t.name] = t.id))

    const products = await queryInterface.sequelize.query(
      "SELECT id FROM products WHERE code LIKE 'SEED-%'",
      { type: Sequelize.QueryTypes.SELECT }
    )

    const links = []
    for (const p of products) {
      const n = 1 + Math.floor(Math.random() * 3) // 1-3 tags
      const chosen = new Set()
      while (chosen.size < n) chosen.add(pick(TAGS))
      chosen.forEach((tn) => {
        const tid = tagByName[tn]
        if (tid) links.push({ productId: p.id, tagId: tid, createdAt: now, updatedAt: now })
      })
    }

    await queryInterface.bulkInsert('product_tags', links)
  },

  async down(queryInterface, Sequelize) {
    const res = await queryInterface.sequelize.query('SELECT id FROM tags WHERE name IN (?)', {
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
