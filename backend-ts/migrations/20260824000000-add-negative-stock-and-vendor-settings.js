'use strict'

/**
 * - products.isNegative: allow stock to go negative per product when checked
 * - orders/customers/categories.code: code columns so prefix/suffix config applies
 * - settings: per-vendor configuration (language, theme, money unit,
 *   sku template, code prefix/suffix, ship delivery, tax defaults)
 *
 * All operations are guarded so the migration is safe to re-run on databases
 * whose schema has drifted (e.g. created through sequelize.sync()).
 */

const columnExists = async (queryInterface, table, column) => {
  const description = await queryInterface.describeTable(table)
  return Object.prototype.hasOwnProperty.call(description, column)
}

const addColumnIfMissing = async (queryInterface, table, column, options) => {
  if (!(await columnExists(queryInterface, table, column))) {
    await queryInterface.addColumn(table, column, options)
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Products: allow negative stock flag
    await addColumnIfMissing(queryInterface, 'products', 'isNegative', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })

    // 2. Code columns for entities that did not have one
    await addColumnIfMissing(queryInterface, 'orders', 'code', { type: Sequelize.STRING })
    await addColumnIfMissing(queryInterface, 'customers', 'code', { type: Sequelize.STRING })
    await addColumnIfMissing(queryInterface, 'categories', 'code', { type: Sequelize.STRING })

    // 3. Per-vendor settings
    await addColumnIfMissing(queryInterface, 'settings', 'vendorId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'vendors', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    })

    const constraints = await queryInterface.getConstraint?.('settings')
    const hasUniqueConstraint = Array.isArray(constraints)
      ? constraints.some((c) => c.name === 'settings_vendor_id_unique')
      : false
    if (!hasUniqueConstraint) {
      try {
        await queryInterface.addConstraint('settings', {
          fields: ['vendorId'],
          type: 'unique',
          name: 'settings_vendor_id_unique'
        })
      } catch (e) {
        // A unique index on vendorId may already exist under another name
      }
    }

    await addColumnIfMissing(queryInterface, 'settings', 'language', {
      type: Sequelize.STRING(10),
      defaultValue: 'vi'
    })
    await addColumnIfMissing(queryInterface, 'settings', 'theme', {
      type: Sequelize.STRING(20),
      defaultValue: 'system'
    })
    await addColumnIfMissing(queryInterface, 'settings', 'moneyUnit', {
      type: Sequelize.STRING(10),
      defaultValue: 'VND'
    })
    await addColumnIfMissing(queryInterface, 'settings', 'moneyUnitPosition', {
      type: Sequelize.STRING(10),
      defaultValue: 'suffix'
    })
    await addColumnIfMissing(queryInterface, 'settings', 'skuTemplate', {
      type: Sequelize.STRING,
      defaultValue: '{CODE}'
    })
    await addColumnIfMissing(queryInterface, 'settings', 'codePrefix', { type: Sequelize.TEXT })
    await addColumnIfMissing(queryInterface, 'settings', 'codeSuffix', { type: Sequelize.TEXT })
    await addColumnIfMissing(queryInterface, 'settings', 'shipDelivery', { type: Sequelize.TEXT })

    // Tax config defaults (kept here so drifted databases get them too)
    await addColumnIfMissing(queryInterface, 'settings', 'defaultTaxRate', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    })
    await addColumnIfMissing(queryInterface, 'settings', 'defaultDiscount', {
      type: Sequelize.BIGINT,
      defaultValue: 0
    })
    await addColumnIfMissing(queryInterface, 'settings', 'defaultSurcharge', {
      type: Sequelize.BIGINT,
      defaultValue: 0
    })
  },

  async down(queryInterface) {
    const removeColumnIfPresent = async (table, column) => {
      if (await columnExists(queryInterface, table, column)) {
        await queryInterface.removeColumn(table, column)
      }
    }

    await removeColumnIfPresent('settings', 'defaultSurcharge')
    await removeColumnIfPresent('settings', 'defaultDiscount')
    await removeColumnIfPresent('settings', 'defaultTaxRate')
    await removeColumnIfPresent('settings', 'shipDelivery')
    await removeColumnIfPresent('settings', 'codeSuffix')
    await removeColumnIfPresent('settings', 'codePrefix')
    await removeColumnIfPresent('settings', 'skuTemplate')
    await removeColumnIfPresent('settings', 'moneyUnitPosition')
    await removeColumnIfPresent('settings', 'moneyUnit')
    await removeColumnIfPresent('settings', 'theme')
    await removeColumnIfPresent('settings', 'language')
    try {
      await queryInterface.removeConstraint('settings', 'settings_vendor_id_unique')
    } catch (e) {
      // constraint may not exist in some environments
    }
    await removeColumnIfPresent('settings', 'vendorId')
    await removeColumnIfPresent('categories', 'code')
    await removeColumnIfPresent('customers', 'code')
    await removeColumnIfPresent('orders', 'code')
    await removeColumnIfPresent('products', 'isNegative')
  }
}
