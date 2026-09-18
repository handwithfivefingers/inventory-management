'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orderDetails', 'barcodeId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'product_barcodes', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    })
    await queryInterface.addColumn('orderDetails', 'priceAtSale', { type: Sequelize.DECIMAL(15, 2), allowNull: true })
    await queryInterface.addColumn('orderDetails', 'conversionRateAtSale', { type: Sequelize.INTEGER, allowNull: true })
    await queryInterface.addColumn('orderDetails', 'unitNameAtSale', { type: Sequelize.STRING(255), allowNull: true })
    await queryInterface.addIndex('orderDetails', ['barcodeId'], { name: 'orderDetails_barcodeId' })

    // Backfill legacy orders as base-unit sales. Existing price remains the
    // historical price; only null values are filled from the base barcode.
    await queryInterface.sequelize.query(
      `UPDATE orderDetails od
       JOIN product_barcodes pb ON pb.variantId = od.variantId AND pb.isBaseUnit = true
       JOIN units u ON u.id = pb.unitId
       SET od.barcodeId = pb.id,
           od.priceAtSale = COALESCE(od.price, pb.retailPrice),
           od.conversionRateAtSale = pb.conversionRate,
           od.unitNameAtSale = u.name
       WHERE od.barcodeId IS NULL`
    )
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('orderDetails', 'orderDetails_barcodeId')
    await queryInterface.removeColumn('orderDetails', 'unitNameAtSale')
    await queryInterface.removeColumn('orderDetails', 'conversionRateAtSale')
    await queryInterface.removeColumn('orderDetails', 'priceAtSale')
    await queryInterface.removeColumn('orderDetails', 'barcodeId')
  }
}
