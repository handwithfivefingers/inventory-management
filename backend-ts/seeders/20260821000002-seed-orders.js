'use strict'

/**
 * Seed orders — DEPRECATED for vendor 4 flow.
 *
 * Direct bulkInsert bypasses OrderService.create, so it does NOT:
 *  - update inventory (increment/decrement with variantId handling + negative-stock guard)
 *  - bump products.sold / productVariants.sold
 *  - create transfer rows (type 0 IN / 1 OUT)
 *  - auto-create financial voucher (expense/import vs revenue/sale)
 *
 * Orders MUST be created via API to populate those tables.
 * See: scripts/mocks/vendor4.orders.json + scripts/e2e-vendor4-api.ts
 *
 * This seeder is kept as a no-op skip. Set ALLOW_LEGACY_ORDER_SEED=1 to force
 * the (bug-fixed) legacy path — still does not create transfers/financial.
 */

const { Op } = require('sequelize')

module.exports = {
  async up(queryInterface, Sequelize) {
    if (process.env.ALLOW_LEGACY_ORDER_SEED === '1') {
      console.log('[seed-orders] ALLOW_LEGACY_ORDER_SEED=1 -> running legacy seed (fixed providerPool, no inventory/transfer/financial)')
      const START = new Date('2026-01-01T00:00:00Z').getTime()
      const END = Date.now()
      const randomDate = () => new Date(START + Math.random() * (END - START))
      const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1))
      const pick = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null)
      const VAT_OPTIONS = [0, 5, 8, 10]
      const providerPool = await queryInterface.sequelize.query('SELECT id FROM providers WHERE vendorId = 4', {
        type: Sequelize.QueryTypes.SELECT
      })
      if (!providerPool.length) {
        console.log('[seed-orders] no providers for vendor 4, abort')
        return
      }
      const [{ maxId }] = await queryInterface.sequelize.query('SELECT MAX(id) AS maxId FROM orders', {
        type: Sequelize.QueryTypes.SELECT
      })
      let orderId = (maxId || 0) + 1
      const whProducts = await queryInterface.sequelize.query(
        'SELECT id, salePrice, costPrice FROM products WHERE vendorId = 4 AND code LIKE ? LIMIT 20',
        { replacements: ['SEED-%'], type: Sequelize.QueryTypes.SELECT }
      )
      if (!whProducts.length) {
        console.log('[seed-orders] no SEED products, abort')
        return
      }
      const orders = []
      const details = []
      for (let o = 0; o < 5; o++) {
        const createdAt = randomDate()
        const lineCount = randInt(1, 3)
        let subtotal = 0
        const orderDetails = []
        for (let j = 0; j < lineCount; j++) {
          const product = pick(whProducts)
          const quantity = randInt(1, 5)
          const price = product.salePrice || randInt(10000, 50000)
          const buyPrice = product.costPrice || Math.round(price * 0.7)
          subtotal += price * quantity
          orderDetails.push({ quantity, price, buyPrice, note: 'SEED', warehouseId: 5, productId: product.id, orderId, createdAt, updatedAt: createdAt })
        }
        const surcharge = Math.random() < 0.2 ? randInt(10000, 50000) : 0
        const VAT = pick(VAT_OPTIONS)
        const price = subtotal + surcharge
        const paid = Math.round(price + (price / 100) * VAT)
        orders.push({ id: orderId, VAT, paid, surcharge, price, paymentType: Math.random() < 0.6 ? 'cash' : 'transfer', providerId: pick(providerPool).id, warehouseId: 5, vendorId: 4, createdAt, updatedAt: createdAt })
        details.push(...orderDetails)
        orderId++
      }
      await queryInterface.bulkInsert('orders', orders)
      await queryInterface.bulkInsert('orderDetails', details)
      return
    }
    console.log('[seed-orders] SKIP - orders must be created via API to generate inventory/transfer/financial. See scripts/e2e-vendor4-api.ts')
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
