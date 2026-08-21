'use strict'

/**
 * Seed orders following the ownership tree: for each warehouse, create
 * ORDERS_PER_WAREHOUSE orders. Every order belongs to that warehouse (warehouseId)
 * and its parent vendor (vendorId), uses a provider of the SAME vendor, and its
 * line items reference only products of that vendor. Dates are randomized
 * between 2026-01-01 and now.
 *
 * Requires: seeded warehouses (with vendorId), providers (SEED-) and products
 * (SEED-, with vendorId).
 *
 * Cleanup: order details are tagged with note = 'SEED' so `down` can remove the
 * orders and their details reliably.
 */

const { Op } = require('sequelize')

const ORDERS_PER_WAREHOUSE = 20
const VAT_OPTIONS = [0, 5, 8, 10]

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
    if (!warehouses.length) throw new Error('seed-orders: run the warehouses seeder first.')

    const providers = await queryInterface.sequelize.query(
      "SELECT id, vendorId FROM providers WHERE name LIKE 'SEED-%'",
      { type: Sequelize.QueryTypes.SELECT }
    )
    if (!providers.length) throw new Error('seed-orders: run the providers seeder first.')

    const [{ maxId }] = await queryInterface.sequelize.query('SELECT MAX(id) AS maxId FROM orders', {
      type: Sequelize.QueryTypes.SELECT
    })
    let orderId = (maxId || 0) + 1

    const orders = []
    const details = []
    const soldAggregate = {} // productId -> total quantity sold

    for (const wh of warehouses) {
      const whProviders = providers.filter((p) => p.vendorId === wh.vendorId)
      const providerPool = whProviders.length ? whProviders : providers

      const whProducts = await queryInterface.sequelize.query(
        'SELECT id, salePrice, costPrice FROM products WHERE vendorId = ? AND code LIKE ?',
        { replacements: [wh.vendorId, 'SEED-%'], type: Sequelize.QueryTypes.SELECT }
      )
      if (!whProducts.length) continue

      for (let o = 0; o < ORDERS_PER_WAREHOUSE; o++) {
        const createdAt = randomDate()
        const lineCount = randInt(1, 5)
        const orderDetails = []
        let subtotal = 0

        for (let j = 0; j < lineCount; j++) {
          const product = pick(whProducts)
          const quantity = randInt(1, 10)
          const price = product.salePrice || randInt(10000, 500000)
          const buyPrice = product.costPrice || Math.round(price * 0.7)
          subtotal += price * quantity

          soldAggregate[product.id] = (soldAggregate[product.id] || 0) + quantity

          orderDetails.push({
            quantity,
            price,
            buyPrice,
            note: 'SEED',
            warehouseId: wh.id,
            productId: product.id,
            orderId,
            createdAt,
            updatedAt: createdAt
          })
        }

        const surcharge = Math.random() < 0.2 ? randInt(10000, 50000) : 0
        const VAT = pick(VAT_OPTIONS)
        const price = subtotal + surcharge
        const paid = Math.random() < 0.85 ? price : Math.round(price * (0.5 + Math.random() * 0.4))

        orders.push({
          id: orderId,
          VAT,
          paid,
          surcharge,
          price,
          paymentType: Math.random() < 0.6 ? 'cash' : 'transfer',
          providerId: pick(providerPool).id,
          warehouseId: wh.id,
          vendorId: wh.vendorId,
          createdAt,
          updatedAt: createdAt
        })

        details.push(...orderDetails)
        orderId++
      }
    }

    await queryInterface.bulkInsert('orders', orders)
    await queryInterface.bulkInsert('orderDetails', details)

    // Update `sold` counter on products to keep data consistent.
    for (const [productId, qty] of Object.entries(soldAggregate)) {
      await queryInterface.sequelize.query('UPDATE products SET sold = COALESCE(sold, 0) + ? WHERE id = ?', {
        replacements: [qty, Number(productId)]
      })
    }
  },

  async down(queryInterface, Sequelize) {
    const seededDetails = await queryInterface.sequelize.query(
      'SELECT DISTINCT orderId FROM orderDetails WHERE note = ?',
      { replacements: ['SEED'], type: Sequelize.QueryTypes.SELECT }
    )
    const orderIds = seededDetails.map((d) => d.orderId)
    if (orderIds.length) {
      await queryInterface.bulkDelete('orderDetails', { note: 'SEED' }, {})
      await queryInterface.bulkDelete('orders', { id: { [Op.in]: orderIds } }, {})
    }
  }
}
