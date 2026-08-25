'use strict'

/**
 * Product variants (attribute-based, WooCommerce style):
 * - productAttributes / productAttributeValues: per-product option matrix
 *   (e.g. Color -> Red, Blue; Size -> S, M, L)
 * - productVariants: one sellable row per attribute combination with its own
 *   SKU/prices/sold counter
 * - product_variant_attribute_values: junction linking a variant to the exact
 *   attribute-value combination it represents
 * - inventories/transfers/orderDetails.variantId: nullable FK. NULL keeps the
 *   legacy product-level behaviour so simple products are unaffected.
 *
 * All operations are guarded so the migration is safe to re-run on databases
 * whose schema has drifted (e.g. created through sequelize.sync()).
 */

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables()
  // showAllTables may return objects on some dialects
  return tables.some((t) => (typeof t === 'string' ? t : t.tableName || t.name) === tableName)
}

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
    // 1. Attribute definitions per product
    if (!(await tableExists(queryInterface, 'productAttributes'))) {
      await queryInterface.createTable('productAttributes', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: Sequelize.STRING, allowNull: false },
        productId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      })
    }

    // 2. Allowed values for each attribute
    if (!(await tableExists(queryInterface, 'productAttributeValues'))) {
      await queryInterface.createTable('productAttributeValues', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        value: { type: Sequelize.STRING, allowNull: false },
        attributeId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'productAttributes', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        productId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      })
      try {
        await queryInterface.addConstraint('productAttributeValues', {
          fields: ['attributeId', 'value'],
          type: 'unique',
          name: 'productAttributeValues_attribute_value_unique'
        })
      } catch (e) {
        // Index may already exist under another name
      }
    }

    // 3. Variant rows (one per sellable combination)
    if (!(await tableExists(queryInterface, 'productVariants'))) {
      await queryInterface.createTable('productVariants', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        productId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        code: { type: Sequelize.STRING, allowNull: true },
        skuCode: { type: Sequelize.STRING, allowNull: false },
        salePrice: { type: Sequelize.BIGINT, allowNull: true },
        regularPrice: { type: Sequelize.BIGINT, allowNull: true },
        wholeSalePrice: { type: Sequelize.BIGINT, allowNull: true },
        costPrice: { type: Sequelize.INTEGER, allowNull: true },
        sold: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
        isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      })
      try {
        await queryInterface.addConstraint('productVariants', {
          fields: ['productId', 'skuCode'],
          type: 'unique',
          name: 'productVariants_product_sku_unique'
        })
      } catch (e) {
        // Index may already exist under another name
      }
    }

    // 4. Junction: variant <-> attribute values
    if (!(await tableExists(queryInterface, 'product_variant_attribute_values'))) {
      await queryInterface.createTable('product_variant_attribute_values', {
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
        variantId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'productVariants', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        attributeValueId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'productAttributeValues', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        }
      })
      try {
        await queryInterface.addConstraint('product_variant_attribute_values', {
          fields: ['variantId', 'attributeValueId'],
          type: 'primary key',
          name: 'pk_product_variant_attribute_values'
        })
      } catch (e) {
        // Composite PK may already exist
      }
    }

    // 5. Nullable variant pointers on stock/movement/order lines
    await addColumnIfMissing(queryInterface, 'inventories', 'variantId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'productVariants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    })
    await addColumnIfMissing(queryInterface, 'transfers', 'variantId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'productVariants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    })
    await addColumnIfMissing(queryInterface, 'orderDetails', 'variantId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'productVariants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    })

    // 6. Lookup index for the common (product, warehouse, variant) stock query
    try {
      await queryInterface.addIndex('inventories', ['productId', 'warehouseId', 'variantId'], {
        name: 'inventories_product_warehouse_variant_idx'
      })
    } catch (e) {
      // Index may already exist
    }
  },

  async down(queryInterface, Sequelize) {
    const dropIfExists = async (table) => {
      if (await tableExists(queryInterface, table)) {
        await queryInterface.dropTable(table)
      }
    }
    for (const table of [
      'product_variant_attribute_values',
      'productVariants',
      'productAttributeValues',
      'productAttributes'
    ]) {
      await dropIfExists(table)
    }
    for (const table of ['inventories', 'transfers', 'orderDetails']) {
      if (await columnExists(queryInterface, table, 'variantId')) {
        await queryInterface.removeColumn(table, 'variantId')
      }
    }
  }
}
