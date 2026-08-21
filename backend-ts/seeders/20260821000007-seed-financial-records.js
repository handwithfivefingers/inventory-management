'use strict'

/**
 * Seed financial records derived from the seeded orders.
 *
 * For every seeded order we create a REVENUE record (phiếu thu, code PT-xxxxx):
 *   - type: 'revenue', category: 'sale'
 *   - amount: the order's `paid` amount
 *   - relatedType: 'order', relatedId: order.id
 *   - warehouseId: the order's warehouse
 *   - transactionDate: the order's createdAt
 *
 * We also add a few EXPENSE records (phiếu chi, code PC-xxxxx) per warehouse
 * (rent + salary) so the financial picture is usable for reporting.
 *
 * All rows are tagged with note = 'SEED-...' for clean rollback.
 * Requires: seeded orders (linked to SEED- vendors) and warehouses.
 */

const { Op } = require('sequelize')

const START = new Date('2026-01-01T00:00:00Z').getTime()
const END = Date.now()
const randomDate = () => new Date(START + Math.random() * (END - START))
const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1))
const round100 = (n) => Math.round(n / 100) * 100
const pick = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null)

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date()

    // Seeded orders are those whose vendor is a SEED- vendor.
    const orders = await queryInterface.sequelize.query(
      `SELECT o.id, o.paid, o.warehouseId, o.createdAt
       FROM orders o
       JOIN vendors v ON o.vendorId = v.id
       WHERE v.name LIKE 'SEED-%'`,
      { type: Sequelize.QueryTypes.SELECT }
    )
    if (!orders.length) throw new Error('seed-financial: run the orders seeder first.')

    const warehouses = await queryInterface.sequelize.query(
      "SELECT id FROM warehouses WHERE name LIKE 'SEED-%'",
      { type: Sequelize.QueryTypes.SELECT }
    )

    const [{ maxId }] = await queryInterface.sequelize.query('SELECT MAX(id) AS maxId FROM financial_records', {
      type: Sequelize.QueryTypes.SELECT
    })
    let nextId = (maxId || 0) + 1

    const rows = []

    // 1) Revenue per order.
    for (const o of orders) {
      const txDate = o.createdAt ? new Date(o.createdAt) : randomDate()
      rows.push({
        id: nextId,
        code: `PT-${String(nextId).padStart(5, '0')}`,
        type: 'revenue',
        category: 'sale',
        amount: o.paid || 0,
        note: `SEED - Doanh thu đơn hàng #${o.id}`,
        relatedType: 'order',
        relatedId: o.id,
        staffId: null,
        warehouseId: o.warehouseId,
        transactionDate: txDate,
        createdAt: now,
        updatedAt: now
      })
      nextId++
    }

    // 2) A few expenses per warehouse (rent + salary) for reporting realism.
    for (const wh of warehouses) {
      // Monthly rent (3 occurrences across the period).
      for (let i = 0; i < 3; i++) {
        rows.push({
          id: nextId,
          code: `PC-${String(nextId).padStart(5, '0')}`,
          type: 'expense',
          category: 'rent',
          amount: round100(randInt(50, 200) * 1000),
          note: `SEED - Tiền thuê kho #${wh.id}`,
          relatedType: null,
          relatedId: null,
          staffId: null,
          warehouseId: wh.id,
          transactionDate: randomDate(),
          createdAt: now,
          updatedAt: now
        })
        nextId++
      }
      // Salary expense.
      rows.push({
        id: nextId,
        code: `PC-${String(nextId).padStart(5, '0')}`,
        type: 'expense',
        category: 'salary',
        amount: round100(randInt(100, 500) * 1000),
        note: `SEED - Lương nhân viên kho #${wh.id}`,
        relatedType: null,
        relatedId: null,
        staffId: null,
        warehouseId: wh.id,
        transactionDate: randomDate(),
        createdAt: now,
        updatedAt: now
      })
      nextId++
    }

    await queryInterface.bulkInsert('financial_records', rows)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'financial_records',
      { note: { [Op.like]: 'SEED-%' } },
      {}
    )
  }
}
