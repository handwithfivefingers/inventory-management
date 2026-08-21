'use strict'

/**
 * Seed inventory levels following the ownership tree: for each warehouse, stock
 * a subset (~70%) of the products that belong to the SAME vendor as the
 * warehouse. This makes every warehouse "contain" multiple products of its own
 * vendor (with some overlap across that vendor's warehouses).
 *
 * Requires: seeded warehouses (with vendorId) and products (SEED-, with vendorId).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date()

    const warehouses = await queryInterface.sequelize.query(
      "SELECT id, vendorId FROM warehouses WHERE name LIKE 'SEED-%'",
      { type: Sequelize.QueryTypes.SELECT }
    )
    if (!warehouses.length) throw new Error('seed-inventory: run the warehouses seeder first.')

    const [{ maxId }] = await queryInterface.sequelize.query('SELECT MAX(id) AS maxId FROM inventories', {
      type: Sequelize.QueryTypes.SELECT
    })
    let nextId = (maxId || 0) + 1

    const rows = []
    for (const wh of warehouses) {
      const products = await queryInterface.sequelize.query(
        'SELECT id FROM products WHERE vendorId = ? AND code LIKE ?',
        { replacements: [wh.vendorId, 'SEED-%'], type: Sequelize.QueryTypes.SELECT }
      )
      for (const p of products) {
        if (Math.random() < 0.7) {
          rows.push({
            id: nextId,
            quantity: Math.floor(Math.random() * 500),
            productId: p.id,
            warehouseId: wh.id,
            createdAt: now,
            updatedAt: now
          })
          nextId++
        }
      }
    }

    await queryInterface.bulkInsert('inventories', rows)
  },

  async down(queryInterface, Sequelize) {
    const res = await queryInterface.sequelize.query("SELECT id FROM products WHERE code LIKE 'SEED-%'", {
      type: Sequelize.QueryTypes.SELECT
    })
    const ids = res.map((r) => r.id)
    if (ids.length) await queryInterface.bulkDelete('inventories', { productId: { [Sequelize.Op.in]: ids } }, {})
  }
}
