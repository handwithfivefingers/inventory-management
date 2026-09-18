'use strict'

/*
 * The legacy barcode column is named `productVariants.code` in this codebase.
 * `regularPrice` is a list/reference price, not a dated promotion, so it is
 * intentionally retained on the legacy row and is not copied to promoPrice.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_barcodes', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      variantId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      unitId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      barcode: { type: Sequelize.STRING(64), allowNull: false },
      conversionRate: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      costPrice: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      retailPrice: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      wholesalePrice: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      promoPrice: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      promoStartAt: { type: Sequelize.DATE, allowNull: true },
      promoEndAt: { type: Sequelize.DATE, allowNull: true },
      isBaseUnit: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    })
    await queryInterface.addIndex('product_barcodes', ['barcode'], {
      unique: true,
      name: 'product_barcodes_barcode_unique'
    })
    await queryInterface.addIndex('product_barcodes', ['variantId'], { name: 'product_barcodes_variantId' })
    await queryInterface.addIndex('product_barcodes', ['unitId'], { name: 'product_barcodes_unitId' })

    // MySQL has no partial unique index. NULL entries do not collide in a UNIQUE
    // index, so this generated column enforces at most one base row per variant.
    await queryInterface.sequelize.query(
      'ALTER TABLE `product_barcodes` ADD COLUMN `baseVariantId` INT GENERATED ALWAYS AS (CASE WHEN `isBaseUnit` THEN `variantId` ELSE NULL END) STORED'
    )
    await queryInterface.addIndex('product_barcodes', ['baseVariantId'], {
      unique: true,
      name: 'product_barcodes_one_base_per_variant'
    })
    // Adding the generated column can rebuild a MySQL table. Add FK
    // constraints only afterwards; adding it to an already-FK'd table caused
    // InnoDB's "Cannot add foreign key constraint" on db:init.
    await queryInterface.addConstraint('product_barcodes', {
      fields: ['variantId'],
      type: 'foreign key',
      name: 'product_barcodes_variantId_fk',
      references: { table: 'productVariants', field: 'id' },
      // `baseVariantId` is a stored generated column derived from `variantId`.
      // MySQL rejects CASCADE actions on a foreign-key column used by a stored
      // generated column, so keep this relationship restrictive.
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT'
    })
    await queryInterface.addConstraint('product_barcodes', {
      fields: ['unitId'],
      type: 'foreign key',
      name: 'product_barcodes_unitId_fk',
      references: { table: 'units', field: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    })

    // Every vendor represented by a legacy barcode needs a base unit. Existing
    // units are selected deterministically (lowest id); otherwise create one.
    await queryInterface.sequelize.query(
      `INSERT INTO units (name, vendorId, createdAt, updatedAt)
       SELECT 'Base unit', p.vendorId, NOW(), NOW()
       FROM products p
       JOIN productVariants pv ON pv.productId = p.id AND pv.code IS NOT NULL AND pv.code <> ''
       LEFT JOIN units u ON u.vendorId = p.vendorId
       WHERE p.vendorId IS NOT NULL AND u.id IS NULL
       GROUP BY p.vendorId`
    )

    const [unresolved] = await queryInterface.sequelize.query(
      `SELECT pv.id
       FROM productVariants pv
       JOIN products p ON p.id = pv.productId
       WHERE pv.code IS NOT NULL AND pv.code <> ''
         AND (p.vendorId IS NULL OR NOT EXISTS (SELECT 1 FROM units u WHERE u.vendorId = p.vendorId))
       LIMIT 10`
    )
    if (unresolved.length) {
      throw new Error(
        `Cannot migrate barcode: variants require a vendor-owned base unit (${unresolved.map((r) => r.id).join(', ')})`
      )
    }

    await queryInterface.sequelize.query(
      `INSERT INTO product_barcodes
         (variantId, unitId, barcode, conversionRate, costPrice, retailPrice, wholesalePrice, isBaseUnit, createdAt, updatedAt)
       SELECT pv.id, (
           SELECT u.id FROM units u WHERE u.vendorId = p.vendorId ORDER BY u.id ASC LIMIT 1
         ), pv.code, 1,
         COALESCE(pv.costPrice, 0), COALESCE(pv.salePrice, pv.regularPrice, 0),
         COALESCE(pv.wholeSalePrice, COALESCE(pv.salePrice, pv.regularPrice, 0)), true, NOW(), NOW()
       FROM productVariants pv
       JOIN products p ON p.id = pv.productId
       WHERE pv.code IS NOT NULL AND pv.code <> ''`
    )

    // Production gate: inspect this query result before applying the separate
    // destructive migration. A mismatch aborts here, leaving legacy data intact.
    const [validation] = await queryInterface.sequelize.query(
      `SELECT
         (SELECT COUNT(*) FROM productVariants WHERE code IS NOT NULL AND code <> '') AS legacyBarcodeCount,
         (SELECT COUNT(*) FROM product_barcodes WHERE isBaseUnit = true) AS migratedBarcodeCount,
         (SELECT COUNT(*) FROM productVariants pv LEFT JOIN product_barcodes pb
            ON pb.variantId = pv.id AND pb.barcode = pv.code AND pb.isBaseUnit = true
          WHERE pv.code IS NOT NULL AND pv.code <> '' AND pb.id IS NULL) AS missingBarcodeCount`
    )
    const result = validation[0]
    if (
      Number(result.legacyBarcodeCount) !== Number(result.migratedBarcodeCount) ||
      Number(result.missingBarcodeCount) !== 0
    ) {
      throw new Error(`Barcode migration validation failed: ${JSON.stringify(result)}`)
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_barcodes')
  }
}
