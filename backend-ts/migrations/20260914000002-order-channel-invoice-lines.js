'use strict'

/**
 * Order channel + per-line invoicing:
 * - orders.channel ENUM('POS','WHOLESALE','ONLINE') default 'WHOLESALE'
 * - invoices.invoiceType ENUM('FULL','PARTIAL') default 'FULL'
 * - invoiceDetails.orderDetailId FK -> orderDetails.id (nullable for legacy rows)
 * - invoiceDetails.variantId (nullable)
 */

const columnExists = async (queryInterface, table, column) => {
  const desc = await queryInterface.describeTable(table)
  return Object.prototype.hasOwnProperty.call(desc, column)
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'orders', 'channel'))) {
      await queryInterface.addColumn('orders', 'channel', {
        type: Sequelize.ENUM('POS', 'WHOLESALE', 'ONLINE'),
        allowNull: false,
        defaultValue: 'WHOLESALE',
        comment: 'sales channel: POS (in-store), WHOLESALE (B2B), ONLINE (e-commerce)'
      })
    }
    if (!(await columnExists(queryInterface, 'invoices', 'invoiceType'))) {
      await queryInterface.addColumn('invoices', 'invoiceType', {
        type: Sequelize.ENUM('FULL', 'PARTIAL'),
        allowNull: false,
        defaultValue: 'FULL',
        comment: 'FULL = covers all remaining order qty, PARTIAL = subset'
      })
    }
    if (!(await columnExists(queryInterface, 'invoiceDetails', 'orderDetailId'))) {
      await queryInterface.addColumn('invoiceDetails', 'orderDetailId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '1 orderDetail -> N invoiceDetails'
      })
    }
    if (!(await columnExists(queryInterface, 'invoiceDetails', 'variantId'))) {
      await queryInterface.addColumn('invoiceDetails', 'variantId', {
        type: Sequelize.INTEGER,
        allowNull: true
      })
    }
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, 'invoiceDetails', 'variantId')) {
      await queryInterface.removeColumn('invoiceDetails', 'variantId')
    }
    if (await columnExists(queryInterface, 'invoiceDetails', 'orderDetailId')) {
      await queryInterface.removeColumn('invoiceDetails', 'orderDetailId')
    }
    if (await columnExists(queryInterface, 'invoices', 'invoiceType')) {
      await queryInterface.removeColumn('invoices', 'invoiceType')
    }
    if (await columnExists(queryInterface, 'orders', 'channel')) {
      await queryInterface.removeColumn('orders', 'channel')
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS `ENUM_orders_channel`').catch(() => {})
    }
  }
}
