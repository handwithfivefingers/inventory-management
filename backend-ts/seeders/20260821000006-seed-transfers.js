'use strict'

/**
 * Seed stock transfers (movements) following the ownership tree: for each
 * warehouse, create TRANSFERS_PER_WAREHOUSE transfers referencing only products
 * of that warehouse's vendor. `type` '0' = IN, '1' = OUT. Dates are randomized
 * between 2026-01-01 and now.
 *
 * Requires: seeded warehouses (with vendorId) and products (SEED-, with vendorId).
 */

const { Op } = require('sequelize')

const TRANSFERS_PER_WAREHOUSE = 25

module.exports = {
  async up(queryInterface, Sequelize) {
    const START = new Date('2026-01-01T00:00:00Z').getTime()
    const END = Date.now()
    const randomDate = () => new Date(START + Math.random() * (END - START))
    const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1))
    const pick = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null)

    const warehouses = await queryInterface.sequelize.query(
      "SELECT id, vendorId FROM warehouses WHERE name LIKE 'SEED-%'",
      { type: Sequelize.QueryTypes.SELECT }
    )
    if (!warehouses.length) throw new Error('seed-transfers: run the warehouses seeder first.')

    const [{ maxId }] = await queryInterface.sequelize.query('SELECT MAX(id) AS maxId FROM transfers', {
      type: Sequelize.QueryTypes.SELECT
    })
    let nextId = (maxId || 0) + 1

    const rows = []
    for (const wh of warehouses) {
      const products = await queryInterface.sequelize.query(
        'SELECT id FROM products WHERE vendorId = ? AND code LIKE ?',
        { replacements: [wh.vendorId, 'SEED-%'], type: Sequelize.QueryTypes.SELECT }
      )
      if (!products.length) continue

      for (let i = 0; i < TRANSFERS_PER_WAREHOUSE; i++) {
        const createdAt = randomDate()
        rows.push({
          id: nextId,
          quantity: randInt(1, 100),
          type: Math.random() < 0.5 ? '0' : '1',
          warehouseId: wh.id,
          productId: pick(products).id,
          createdAt,
          updatedAt: createdAt
        })
        nextId++
      }
    }

    await queryInterface.bulkInsert('transfers', rows)
  },

  async down(queryInterface, Sequelize) {
    const res = await queryInterface.sequelize.query("SELECT id FROM products WHERE code LIKE 'SEED-%'", {
      type: Sequelize.QueryTypes.SELECT
    })
    const ids = res.map((r) => r.id)
    if (ids.length) await queryInterface.bulkDelete('transfers', { productId: { [Op.in]: ids } }, {})
  }
}
