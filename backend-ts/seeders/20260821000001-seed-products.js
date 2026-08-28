'use strict'

/**
 * Seed products.
 *
 * Generates 80 products across several categories with realistic VND pricing.
 * Foreign keys `unitId` / `vendorId` are optional, so we pick random existing
 * rows from `units` / `vendors` if they exist, otherwise leave them NULL.
 *
 * `code` is prefixed with `SEED-` so the `down` method can clean up safely.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date()

    // Products are owned by a vendor (distributed round-robin) and may use a unit.
    const [units, vendors] = await Promise.all([
      queryInterface.sequelize.query('SELECT id FROM units', { type: Sequelize.QueryTypes.SELECT }),
      queryInterface.sequelize.query("SELECT id FROM vendors WHERE name LIKE 'SEED-%'", {
        type: Sequelize.QueryTypes.SELECT
      })
    ])
    const unitIds = units.map((u) => u.id)
    const vendorIds = vendors.map((v) => v.id)
    if (!vendorIds.length) throw new Error('seed-products: run the vendors seeder first.')
    const pick = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null)
    const round100 = (n) => Math.round(n / 100) * 100

    // product catalog: category -> { unit, items }
    const CATALOG = [
      {
        category: 'Electronics',
        unit: 'Cái',
        items: [
          'Tai nghe Bluetooth',
          'Loa di động',
          'Sạc dự phòng',
          'Bàn phím cơ',
          'Chuột không dây',
          'Webcam HD',
          'Màn hình 24 inch',
          'Router Wifi',
          'Cáp HDMI',
          'Ổ cứng di động',
          'Tai nghe gaming',
          'Camera an ninh'
        ]
      },
      {
        category: 'Stationery',
        unit: 'Quyển',
        items: [
          'Sổ tay A5',
          'Bút bi',
          'Bút chì',
          'Giấy A4',
          'Ghim bấm',
          'Băng keo',
          'Thước kẻ',
          'Tẩy',
          'File hồ sơ',
          'Bút highlight'
        ]
      },
      {
        category: 'Kitchen',
        unit: 'Cái',
        items: [
          'Nồi cơm điện',
          'Ấm siêu tốc',
          'Chảo chống dính',
          'Bình giữ nhiệt',
          'Dao nhà bếp',
          'Thớt gỗ',
          'Ly thủy tinh',
          'Hộp đựng thực phẩm',
          'Máy xay sinh tố',
          'Đĩa sứ'
        ]
      },
      {
        category: 'Beverage',
        unit: 'Chai',
        items: [
          'Nước khoáng',
          'Nước tăng lực',
          'Trà xanh đóng chai',
          'Cà phê lon',
          'Nước ép trái cây',
          'Sữa tươi',
          'Nước dừa',
          'Bia tươi',
          'Soda chanh',
          'Trà sữa',
          'Nước yến',
          'Rượu vang'
        ]
      },
      {
        category: 'Cleaning',
        unit: 'Chai',
        items: [
          'Nước rửa chén',
          'Nước lau sàn',
          'Xà phòng giặt',
          'Nước tẩy javen',
          'Khăn lau đa năng',
          'Bình xịt khử khuẩn',
          'Bột giặt',
          'Nước rửa tay'
        ]
      },
      {
        category: 'Personal Care',
        unit: 'Cái',
        items: [
          'Kem đánh răng',
          'Bàn chải',
          'Dầu gội',
          'Sữa tắm',
          'Lăn khử mùi',
          'Kem dưỡng da',
          'Bông tắm',
          'Khẩu trang',
          'Nước hoa',
          'Máy cạo râu'
        ]
      },
      {
        category: 'Food',
        unit: 'Gói',
        items: [
          'Mì tôm',
          'Gạo thơm',
          'Đường tinh luyện',
          'Nước mắm',
          'Tương ớt',
          'Bánh quy',
          'Snack khoai tây',
          'Cà phê hạt',
          'Sữa bột',
          'Dầu ăn'
        ]
      },
      {
        category: 'Tools',
        unit: 'Cái',
        items: ['Tua vít', 'Kìm cắt', 'Búa', 'Thước cuộn', 'Máy khoan', 'Cưa tay', 'Kéo cắt sắt', 'Đèn pin']
      }
    ]

    // Determine starting id so we never collide with existing rows.
    const [{ maxId }] = await queryInterface.sequelize.query('SELECT MAX(id) AS maxId FROM products', {
      type: Sequelize.QueryTypes.SELECT
    })
    let nextId = (maxId || 0) + 1
    let productIndex = 0

    const products = []
    for (const group of CATALOG) {
      for (const item of group.items) {
        const costPrice = round100(10000 + Math.random() * 490000) // 10k - 500k
        const salePrice = round100(costPrice * (1.2 + Math.random() * 0.6)) // margin 20% - 80%
        const regularPrice = round100(salePrice * 1.1)
        const wholeSalePrice = round100(costPrice * (1.1 + Math.random() * 0.2))
        const code = `SEED-${String(nextId).padStart(4, '0')}`
        const skuCode = `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

        products.push({
          id: nextId,
          name: `${item}`,
          code,
          skuCode,
          description: `${group.category} - ${item}`,
          salePrice,
          regularPrice,
          wholeSalePrice,
          costPrice,
          sold: 0,
          unitId: pick(unitIds),
          // vendorId: vendorIds[productIndex % vendorIds.length],
          vendorId: 1,
          createdAt: now,
          updatedAt: now
        })
        nextId++
        productIndex++
      }
    }

    await queryInterface.bulkInsert('products', products)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('products', { code: { [require('sequelize').Op.like]: 'SEED-%' } }, {})
  }
}
