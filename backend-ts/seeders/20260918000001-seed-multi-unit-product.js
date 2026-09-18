'use strict'

/* Idempotent product fixture for manual/PW verification of the multi-unit UI.
 * It deliberately uses its own recognizable barcode namespace so down() never
 * touches user-entered catalog data. */
const selectOne = async (queryInterface, Sequelize, sql, replacements) => {
  const rows = await queryInterface.sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT })
  return rows[0] || null
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const vendor = await selectOne(queryInterface, Sequelize,
      'SELECT v.id FROM vendors v JOIN users u ON u.id = v.userId WHERE u.email = :email LIMIT 1',
      { email: 'seed-staff@example.com' })
    if (!vendor) return
    const existing = await selectOne(queryInterface, Sequelize,
      'SELECT pv.id FROM productVariants pv WHERE pv.skuCode = :sku LIMIT 1', { sku: 'DEMO-MULTI-RED' })
    if (existing) return
    const warehouse = await selectOne(queryInterface, Sequelize,
      'SELECT id FROM warehouses WHERE vendorId = :vendorId ORDER BY isMain DESC, id ASC LIMIT 1', { vendorId: vendor.id })
    if (!warehouse) return
    let unit = await selectOne(queryInterface, Sequelize,
      'SELECT id FROM units WHERE vendorId = :vendorId AND name = :name LIMIT 1', { vendorId: vendor.id, name: 'Cái' })
    const now = new Date()
    if (!unit) {
      await queryInterface.bulkInsert('units', [{ name: 'Cái', vendorId: vendor.id, createdAt: now, updatedAt: now }])
      unit = await selectOne(queryInterface, Sequelize, 'SELECT id FROM units WHERE vendorId = :vendorId AND name = :name LIMIT 1', { vendorId: vendor.id, name: 'Cái' })
    }
    let pack = await selectOne(queryInterface, Sequelize,
      'SELECT id FROM units WHERE vendorId = :vendorId AND name = :name LIMIT 1', { vendorId: vendor.id, name: 'Hộp' })
    if (!pack) {
      await queryInterface.bulkInsert('units', [{ name: 'Hộp', vendorId: vendor.id, createdAt: now, updatedAt: now }])
      pack = await selectOne(queryInterface, Sequelize, 'SELECT id FROM units WHERE vendorId = :vendorId AND name = :name LIMIT 1', { vendorId: vendor.id, name: 'Hộp' })
    }
    await queryInterface.bulkInsert('products', [{ name: 'DEMO Multi-unit product', description: 'Two variants, base and pack selling units', type: 1, unitId: unit.id, vendorId: vendor.id, createdAt: now, updatedAt: now }])
    const product = await selectOne(queryInterface, Sequelize, 'SELECT id FROM products WHERE vendorId = :vendorId AND name = :name ORDER BY id DESC LIMIT 1', { vendorId: vendor.id, name: 'DEMO Multi-unit product' })
    const variants = [
      { productId: product.id, skuCode: 'DEMO-MULTI-RED', VAT: 0, sold: 0, isActive: true, isNegative: false, createdAt: now, updatedAt: now },
      { productId: product.id, skuCode: 'DEMO-MULTI-BLUE', VAT: 0, sold: 0, isActive: true, isNegative: false, createdAt: now, updatedAt: now }
    ]
    await queryInterface.bulkInsert('productVariants', variants)
    const created = await queryInterface.sequelize.query('SELECT id, skuCode FROM productVariants WHERE skuCode IN (:red, :blue)', {
      replacements: { red: 'DEMO-MULTI-RED', blue: 'DEMO-MULTI-BLUE' }, type: Sequelize.QueryTypes.SELECT
    })
    const bySku = Object.fromEntries(created.map((row) => [row.skuCode, row.id]))
    const rows = [
      ['RED-BASE', 'DEMO-MULTI-RED-BASE', unit.id, 1, 10000, 15000, 13000], ['RED-PACK', 'DEMO-MULTI-RED-PACK', pack.id, 12, 120000, 180000, 156000],
      ['BLUE-BASE', 'DEMO-MULTI-BLUE-BASE', unit.id, 1, 11000, 16000, 14000], ['BLUE-PACK', 'DEMO-MULTI-BLUE-PACK', pack.id, 12, 132000, 192000, 168000]
    ]
    await queryInterface.bulkInsert('product_barcodes', rows.map(([variantKey, barcode, unitId, conversionRate, costPrice, retailPrice, wholesalePrice]) => ({
      variantId: bySku[variantKey.startsWith('RED') ? 'DEMO-MULTI-RED' : 'DEMO-MULTI-BLUE'], unitId, barcode, conversionRate, costPrice, retailPrice, wholesalePrice, promoPrice: null, createdAt: now, updatedAt: now
    })))
    await queryInterface.bulkInsert('inventories', [
      { productId: product.id, variantId: bySku['DEMO-MULTI-RED'], warehouseId: warehouse.id, quantity: 25, createdAt: now, updatedAt: now },
      { productId: product.id, variantId: bySku['DEMO-MULTI-BLUE'], warehouseId: warehouse.id, quantity: 36, createdAt: now, updatedAt: now }
    ])
    await queryInterface.bulkInsert('transfers', [
      { productId: product.id, variantId: bySku['DEMO-MULTI-RED'], fromWarehouseId: warehouse.id, quantity: 25, type: '0', createdAt: now, updatedAt: now },
      { productId: product.id, variantId: bySku['DEMO-MULTI-BLUE'], fromWarehouseId: warehouse.id, quantity: 36, type: '0', createdAt: now, updatedAt: now }
    ])
  },
  async down(queryInterface, Sequelize) {
    const variants = await queryInterface.sequelize.query('SELECT id FROM productVariants WHERE skuCode IN (:red, :blue)', { replacements: { red: 'DEMO-MULTI-RED', blue: 'DEMO-MULTI-BLUE' }, type: Sequelize.QueryTypes.SELECT })
    if (!variants.length) return
    const ids = variants.map((row) => row.id)
    await queryInterface.bulkDelete('inventories', { variantId: ids }, {})
    await queryInterface.bulkDelete('transfers', { variantId: ids }, {})
    await queryInterface.bulkDelete('product_barcodes', { variantId: ids }, {})
    const products = await queryInterface.sequelize.query('SELECT DISTINCT productId FROM productVariants WHERE id IN (:ids)', { replacements: { ids }, type: Sequelize.QueryTypes.SELECT })
    await queryInterface.bulkDelete('productVariants', { id: ids }, {})
    if (products.length) await queryInterface.bulkDelete('products', { id: products.map((row) => row.productId) }, {})
  }
}
