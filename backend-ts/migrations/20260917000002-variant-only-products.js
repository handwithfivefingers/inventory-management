'use strict'

const SELLABLE_PRODUCT_COLUMNS = [
  'code',
  'skuCode',
  'salePrice',
  'regularPrice',
  'wholeSalePrice',
  'costPrice',
  'VAT',
  'sold',
  'image',
  'isNegative'
]

const nullableVariantTables = ['inventories', 'orderDetails', 'transfers', 'invoiceDetails', 'stocktake_details']

const describe = async (queryInterface, table) => {
  try {
    return await queryInterface.describeTable(table)
  } catch {
    return {}
  }
}

const hasColumn = async (queryInterface, table, column) => Boolean((await describe(queryInterface, table))[column])

const ensureColumn = async (queryInterface, Sequelize, table, column, spec) => {
  if (!(await hasColumn(queryInterface, table, column))) {
    await queryInterface.addColumn(table, column, spec)
  }
}

const getForeignKeys = async (queryInterface, table, column) => {
  const [constraints] = await queryInterface.sequelize.query(
    `
      SELECT CONSTRAINT_NAME AS constraintName
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { replacements: [table, column] }
  )

  return constraints.map((constraint) => constraint.constraintName)
}

const removeVariantForeignKeys = async (queryInterface, table) => {
  const constraints = await getForeignKeys(queryInterface, table, 'variantId')

  for (const constraint of constraints) {
    await queryInterface.removeConstraint(table, constraint)
  }
}

const addVariantForeignKey = async (queryInterface, table, onDelete) => {
  await queryInterface.addConstraint(table, {
    fields: ['variantId'],
    type: 'foreign key',
    name: `${table}_variantId_fk`,
    references: {
      table: 'productVariants',
      field: 'id'
    },
    onDelete,
    onUpdate: 'CASCADE'
  })
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await ensureColumn(queryInterface, Sequelize, 'productVariants', 'code', {
      type: Sequelize.STRING,
      allowNull: true
    })
    await ensureColumn(queryInterface, Sequelize, 'productVariants', 'skuCode', {
      type: Sequelize.STRING,
      allowNull: true
    })
    await ensureColumn(queryInterface, Sequelize, 'productVariants', 'salePrice', {
      type: Sequelize.BIGINT,
      allowNull: true
    })
    await ensureColumn(queryInterface, Sequelize, 'productVariants', 'regularPrice', {
      type: Sequelize.BIGINT,
      allowNull: true
    })
    await ensureColumn(queryInterface, Sequelize, 'productVariants', 'wholeSalePrice', {
      type: Sequelize.BIGINT,
      allowNull: true
    })
    await ensureColumn(queryInterface, Sequelize, 'productVariants', 'costPrice', {
      type: Sequelize.INTEGER,
      allowNull: true
    })
    await ensureColumn(queryInterface, Sequelize, 'productVariants', 'VAT', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    })
    await ensureColumn(queryInterface, Sequelize, 'productVariants', 'sold', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    })
    await ensureColumn(queryInterface, Sequelize, 'productVariants', 'imageUrl', {
      type: Sequelize.STRING,
      allowNull: true
    })
    await ensureColumn(queryInterface, Sequelize, 'productVariants', 'isNegative', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
    await ensureColumn(queryInterface, Sequelize, 'productVariants', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    })

    const productColumns = await describe(queryInterface, 'products')
    const variantColumns = await describe(queryInterface, 'productVariants')

    if (productColumns.code && variantColumns.skuCode) {
      const productExpr = {
        code: productColumns.code ? "NULLIF(p.code, '')" : 'NULL',
        skuCode: productColumns.skuCode ? "NULLIF(p.skuCode, '')" : 'NULL',
        salePrice: productColumns.salePrice ? 'p.salePrice' : 'NULL',
        regularPrice: productColumns.regularPrice ? 'p.regularPrice' : 'NULL',
        wholeSalePrice: productColumns.wholeSalePrice ? 'p.wholeSalePrice' : 'NULL',
        costPrice: productColumns.costPrice ? 'p.costPrice' : 'NULL',
        VAT: productColumns.VAT ? 'COALESCE(p.VAT, 0)' : '0',
        sold: productColumns.sold ? 'COALESCE(p.sold, 0)' : '0',
        image: productColumns.image ? 'p.image' : 'NULL',
        isNegative: productColumns.isNegative ? 'COALESCE(p.isNegative, 0)' : '0'
      }
      await queryInterface.sequelize.query(`
        INSERT INTO productVariants
          (productId, code, skuCode, salePrice, regularPrice, wholeSalePrice, costPrice, VAT, sold, imageUrl, isNegative, isActive, createdAt, updatedAt)
        SELECT
          p.id,
          ${productExpr.code},
          COALESCE(${productExpr.skuCode}, CONCAT('P-', p.id, '-DEFAULT')),
          ${productExpr.salePrice},
          ${productExpr.regularPrice},
          ${productExpr.wholeSalePrice},
          ${productExpr.costPrice},
          ${productExpr.VAT},
          ${productExpr.sold},
          ${productExpr.image},
          ${productExpr.isNegative},
          1,
          NOW(),
          NOW()
        FROM products p
        LEFT JOIN productVariants pv ON pv.productId = p.id AND pv.deletedAt IS NULL
        WHERE pv.id IS NULL
      `)
    }

    await queryInterface.sequelize.query(`
      UPDATE productVariants
      SET skuCode = CONCAT('V-', id)
      WHERE skuCode IS NULL OR skuCode = ''
    `)
    await queryInterface.changeColumn('productVariants', 'skuCode', {
      type: Sequelize.STRING,
      allowNull: false
    })

    for (const table of nullableVariantTables) {
      if (!(await hasColumn(queryInterface, table, 'variantId'))) continue
      await queryInterface.sequelize.query(`
        UPDATE ${table} t
        JOIN productVariants pv ON pv.productId = t.productId AND pv.deletedAt IS NULL
        SET t.variantId = pv.id
        WHERE t.variantId IS NULL
      `)
      const nullVariantRows = await queryInterface.sequelize.query(
        `SELECT COUNT(*) AS count FROM ${table} WHERE variantId IS NULL`,
        { type: Sequelize.QueryTypes.SELECT }
      )
      if (Number(nullVariantRows[0]?.count ?? 0) > 0) {
        throw new Error(`Cannot require ${table}.variantId because some rows could not be mapped to a product variant`)
      }
      const missingVariantRows = await queryInterface.sequelize.query(
        `
          SELECT COUNT(*) AS count
          FROM ${table} t
          LEFT JOIN productVariants pv ON pv.id = t.variantId
          WHERE t.variantId IS NOT NULL AND pv.id IS NULL
        `,
        { type: Sequelize.QueryTypes.SELECT }
      )
      if (Number(missingVariantRows[0]?.count ?? 0) > 0) {
        throw new Error(`Cannot add ${table}.variantId foreign key because some rows reference missing product variants`)
      }
      await removeVariantForeignKeys(queryInterface, table)
      await queryInterface.changeColumn(table, 'variantId', {
        type: Sequelize.INTEGER,
        allowNull: false
      })
      await addVariantForeignKey(queryInterface, table, 'RESTRICT')
    }

    if (variantColumns.imageUrl && productColumns.image) {
      await queryInterface.sequelize.query(`
        UPDATE productVariants pv
        JOIN products p ON p.id = pv.productId
        SET pv.imageUrl = COALESCE(pv.imageUrl, p.image)
        WHERE p.image IS NOT NULL
      `)
    }

    for (const column of SELLABLE_PRODUCT_COLUMNS) {
      if (await hasColumn(queryInterface, 'products', column)) {
        await queryInterface.removeColumn('products', column)
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const productColumns = await describe(queryInterface, 'products')
    const add = async (column, spec) => {
      if (!productColumns[column]) await queryInterface.addColumn('products', column, spec)
    }

    await add('code', { type: Sequelize.STRING, allowNull: true })
    await add('skuCode', { type: Sequelize.STRING, allowNull: true })
    await add('salePrice', { type: Sequelize.BIGINT, allowNull: true })
    await add('regularPrice', { type: Sequelize.BIGINT, allowNull: true })
    await add('wholeSalePrice', { type: Sequelize.BIGINT, allowNull: true })
    await add('costPrice', { type: Sequelize.INTEGER, allowNull: true })
    await add('VAT', { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 })
    await add('sold', { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 })
    await add('image', { type: Sequelize.STRING, allowNull: true })
    await add('isNegative', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false })

    await queryInterface.sequelize.query(`
      UPDATE products p
      JOIN productVariants pv ON pv.productId = p.id AND pv.deletedAt IS NULL
      SET
        p.code = pv.code,
        p.skuCode = pv.skuCode,
        p.salePrice = pv.salePrice,
        p.regularPrice = pv.regularPrice,
        p.wholeSalePrice = pv.wholeSalePrice,
        p.costPrice = pv.costPrice,
        p.VAT = pv.VAT,
        p.sold = pv.sold,
        p.image = pv.imageUrl,
        p.isNegative = pv.isNegative
    `)

    for (const table of nullableVariantTables) {
      if (await hasColumn(queryInterface, table, 'variantId')) {
        await removeVariantForeignKeys(queryInterface, table)
        await queryInterface.changeColumn(table, 'variantId', {
          type: Sequelize.INTEGER,
          allowNull: true
        })
        await addVariantForeignKey(queryInterface, table, 'SET NULL')
      }
    }
  }
}
