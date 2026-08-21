'use strict'

/**
 * Seed categories and link them to the seeded products.
 *
 * Creates 8 catalog categories (matching the product seeder's groups) plus
 * 4 promo categories, then links each product to its matching catalog
 * category (parsed from `description`) and, with some probability, to a
 * promo category.
 */

const { Op } = require('sequelize')

const CATALOG = ['Electronics', 'Stationery', 'Kitchen', 'Beverage', 'Cleaning', 'Personal Care', 'Food', 'Tools']
const PROMO = ['Best Seller', 'New Arrival', 'On Sale', 'Featured']
const ALL = [...CATALOG, ...PROMO]

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date()
    const pick = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null)

    const [vendors] = await Promise.all([
      queryInterface.sequelize.query('SELECT id FROM vendors', { type: Sequelize.QueryTypes.SELECT })
    ])
    const vendorIds = vendors.map((v) => v.id)

    await queryInterface.bulkInsert(
      'categories',
      ALL.map((name) => ({ name, vendorId: pick(vendorIds), createdAt: now, updatedAt: now }))
    )

    const inserted = await queryInterface.sequelize.query('SELECT id, name FROM categories WHERE name IN (?)', {
      replacements: [ALL],
      type: Sequelize.QueryTypes.SELECT
    })
    const catByName = {}
    inserted.forEach((c) => (catByName[c.name] = c.id))

    const products = await queryInterface.sequelize.query(
      "SELECT id, description FROM products WHERE code LIKE 'SEED-%'",
      { type: Sequelize.QueryTypes.SELECT }
    )

    const links = []
    for (const p of products) {
      const catName = (p.description || '').split(' - ')[0]
      const cid = catByName[catName]
      if (cid) links.push({ productId: p.id, categoryId: cid, createdAt: now, updatedAt: now })

      if (Math.random() < 0.4) {
        const pc = pick(PROMO.map((n) => catByName[n]))
        if (pc) links.push({ productId: p.id, categoryId: pc, createdAt: now, updatedAt: now })
      }
    }

    await queryInterface.bulkInsert('product_categories', links)
  },

  async down(queryInterface, Sequelize) {
    const res = await queryInterface.sequelize.query('SELECT id FROM categories WHERE name IN (?)', {
      replacements: [ALL],
      type: Sequelize.QueryTypes.SELECT
    })
    const ids = res.map((r) => r.id)
    if (ids.length) {
      await queryInterface.bulkDelete('product_categories', { categoryId: { [Op.in]: ids } }, {})
      await queryInterface.bulkDelete('categories', { id: { [Op.in]: ids } }, {})
    }
  }
}
