'use strict'

/**
 * Seed products — DEPRECATED for vendor 4 flow.
 *
 * Direct bulkInsert bypasses ProductService.create, so it does NOT create
 * inventory rows, transfer history (type 0 IN), nor enforce code/sku generation.
 * That breaks the verification chain:
 *   product create via API -> inventory SUM, transfer type 0, history, category/tag linkage.
 *
 * For the requested flow, products MUST be created via the API.
 * See: scripts/mocks/vendor4.products.json + scripts/e2e-vendor4-api.ts
 *
 * This seeder is kept as a no-op (idempotent skip). To force legacy seed, set
 * env ALLOW_LEGACY_PRODUCT_SEED=1.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    if (process.env.ALLOW_LEGACY_PRODUCT_SEED === '1') {
      console.log('[seed-products] ALLOW_LEGACY_PRODUCT_SEED=1 -> running legacy bulkInsert (no inventory/transfer)')
      const now = new Date()
      const [units] = await Promise.all([
        queryInterface.sequelize.query('SELECT id FROM units', { type: Sequelize.QueryTypes.SELECT })
      ])
      const unitIds = units.map((u) => u.id)
      const pick = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null)
      const round100 = (n) => Math.round(n / 100) * 100
      const CATALOG = [
        { category: 'Electronics', items: ['Tai nghe Bluetooth', 'Loa di động'] },
        { category: 'Beverage', items: ['Nước khoáng', 'Sữa tươi'] }
      ]
      const [{ maxId }] = await queryInterface.sequelize.query('SELECT MAX(id) AS maxId FROM products', {
        type: Sequelize.QueryTypes.SELECT
      })
      let nextId = (maxId || 0) + 1
      const products = []
      for (const group of CATALOG) {
        for (const item of group.items) {
          const costPrice = round100(10000 + Math.random() * 490000)
          const salePrice = round100(costPrice * 1.4)
          products.push({
            id: nextId++,
            name: item,
            code: `SEED-${String(nextId).padStart(4, '0')}`,
            skuCode: `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            description: `${group.category} - ${item}`,
            salePrice,
            regularPrice: round100(salePrice * 1.1),
            wholeSalePrice: round100(costPrice * 1.15),
            costPrice,
            sold: 0,
            unitId: pick(unitIds),
            vendorId: 4,
            createdAt: now,
            updatedAt: now
          })
        }
      }
      if (products.length) await queryInterface.bulkInsert('products', products)
      return
    }
    console.log('[seed-products] SKIP - products must be created via API to generate inventory/transfer/history. See scripts/e2e-vendor4-api.ts')
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('products', { code: { [require('sequelize').Op.like]: 'SEED-%' } }, {})
  }
}
