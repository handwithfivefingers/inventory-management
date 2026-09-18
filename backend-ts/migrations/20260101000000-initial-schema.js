'use strict'

/**
 * BASELINE migration - full first-install schema.
 *
 * This is the ONLY place that creates the runtime tables. It must stay in
 * sync with `src/database/models/**` (sequelize-typescript decorators) and be
 * timestamped BEFORE every other migration so a fresh database runs it first.
 *
 * - Creates every table, column, unique key and foreign key from the models.
 * - Also creates the three join tables that have no dedicated model file:
 *   `product_tags`, `productVariantAttributeValues` and `user_roles` (they
 *   only exist via @BelongsToMany / raw seeders).
 * - Idempotent: each table is skipped when it already exists, so it is safe to
 *   run against an already-synced dev database (SequelizeMeta will just record
 *   the run). `down` drops the baseline tables in reverse dependency order.
 *
 * NOTE: role_permissions intentionally has NO C/R/U/D flag columns - the
 * grants live on `permissions.method` (see 20260225000001). users has no
 * `isActive` column (inactive entities are handled via paranoid deletedAt).
 */

const tableExists = async (queryInterface, table) => {
  const tables = await queryInterface.showAllTables()
  return tables.some((t) => String(t).replace(/^`.*`$/, '') === table)
}

const createTableIfMissing = async (queryInterface, Sequelize, table, attributes, options = {}, indexes = []) => {
  if (await tableExists(queryInterface, table)) {
    console.log(`initial-schema: ${table} already exists, skipping`)
    return
  }
  await queryInterface.createTable(table, attributes, {
    engine: 'InnoDB',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    ...options
  })
  for (const idx of indexes) {
    await queryInterface.addIndex(table, idx.fields, { name: idx.name, ...(idx.options || {}) })
  }
  console.log(`initial-schema: created ${table}`)
}

// Configured below: onDelete/onUpdate are sourced from the @BelongsTo
// decorators in src/database/models.
const fk = (Sequelize, column, refTable, onDelete, onUpdate) => ({
  type: Sequelize.INTEGER,
  onUpdate,
  onDelete,
  references: { model: refTable, key: 'id' }
})

module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, BIGINT, STRING, TEXT, BOOLEAN, DATE, DATEONLY, ENUM } = Sequelize

    // --- 1. users (src/database/models/user.ts) -------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'users',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        email: { type: STRING, allowNull: false },
        password: { type: STRING, allowNull: true },
        subscription: { type: ENUM('free', 'paid'), defaultValue: 'free' },
        secret: { type: STRING, allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [{ name: 'email', fields: ['email'], options: { unique: true } }]
    )

    // --- 2. vendors (src/database/models/vendor.ts) ----------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'vendors',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        name: { type: STRING, allowNull: true },
        niche: { type: STRING, allowNull: true, defaultValue: 'other' },
        legal_name: { type: STRING, allowNull: true },
        tax_number: { type: STRING, allowNull: true },
        address: { type: TEXT, allowNull: true },
        email: { type: STRING, allowNull: true },
        phone: { type: STRING, allowNull: true },
        invoice_series_prefix: { type: STRING(20), allowNull: true },
        userId: { ...fk(Sequelize, 'userId', 'users', 'CASCADE', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'vendors_userId', fields: ['userId'] },
        { name: 'vendors_legal_name', fields: ['legal_name'] },
        { name: 'vendors_invoice_series_prefix', fields: ['invoice_series_prefix'] }
      ]
    )

    // --- 3. roles (src/database/models/role.ts) ---------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'roles',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        name: { type: STRING, allowNull: true },
        description: { type: STRING, allowNull: true },
        vendorId: { ...fk(Sequelize, 'vendorId', 'vendors', 'SET NULL', 'CASCADE'), allowNull: true },
        isGlobal: { type: BOOLEAN, defaultValue: false },
        isSystem: { type: BOOLEAN, defaultValue: false },
        isAdmin: { type: BOOLEAN, defaultValue: false },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [{ name: 'roles_vendorId', fields: ['vendorId'] }]
    )

    // --- 4. permissions (src/database/models/permission.ts) ---------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'permissions',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        name: { type: STRING, allowNull: false },
        description: { type: STRING, allowNull: true },
        method: { type: ENUM('CREATE', 'UPDATE', 'READ', 'DELETE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'permissions_name_method_unique', fields: ['name', 'method'], options: { unique: true } },
        { name: 'name', fields: ['name'] }
      ]
    )

    // --- 5. role_permissions (src/database/models/role_permission.ts) ------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'role_permissions',
      {
        roleId: {
          ...fk(Sequelize, 'roleId', 'roles', 'CASCADE', 'CASCADE'),
          allowNull: false,
          primaryKey: true
        },
        permissionId: {
          ...fk(Sequelize, 'permissionId', 'permissions', 'CASCADE', 'CASCADE'),
          allowNull: false,
          primaryKey: true
        },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      }
    )

    // --- 6. user_roles (no model file; used by 20260820000001 seeder + role down) --
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'user_roles',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        userId: { ...fk(Sequelize, 'userId', 'users', 'CASCADE', 'CASCADE'), allowNull: false },
        roleId: { ...fk(Sequelize, 'roleId', 'roles', 'CASCADE', 'CASCADE'), allowNull: false },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'user_roles_userId', fields: ['userId'], options: { unique: true } },
        { name: 'user_roles_roleId', fields: ['roleId'] }
      ]
    )

    // --- 7. staff (src/database/models/staff.ts) ---------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'staff',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        code: { type: STRING, allowNull: false },
        fullName: { type: STRING, allowNull: false },
        gender: { type: ENUM('male', 'female', 'other'), allowNull: true },
        phone: { type: STRING, allowNull: true },
        salary: { type: BIGINT, allowNull: true },
        hireDate: { type: DATEONLY, allowNull: true },
        status: { type: ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
        address: { type: STRING, allowNull: true },
        userId: { ...fk(Sequelize, 'userId', 'users', 'SET NULL', 'CASCADE'), allowNull: true },
        roleId: { ...fk(Sequelize, 'roleId', 'roles', 'SET NULL', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'staff_code_unique', fields: ['code'], options: { unique: true } },
        { name: 'staff_userId', fields: ['userId'] },
        { name: 'staff_roleId', fields: ['roleId'] }
      ]
    )

    // --- 8. staff_vendor (src/database/models/staff_vendor.ts) ---------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'staff_vendor',
      {
        staffId: { ...fk(Sequelize, 'staffId', 'staff', 'CASCADE', 'CASCADE'), allowNull: false, primaryKey: true },
        vendorId: { ...fk(Sequelize, 'vendorId', 'vendors', 'CASCADE', 'CASCADE'), allowNull: false, primaryKey: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [{ name: 'staffId', fields: ['staffId'] }]
    )

    // --- 9. warehouses (src/database/models/warehouse.ts) --------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'warehouses',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        name: { type: STRING, allowNull: false },
        phone: { type: STRING, allowNull: true },
        address: { type: STRING, allowNull: true },
        email: { type: STRING, allowNull: true },
        isMain: { type: BOOLEAN, defaultValue: false },
        vendorId: { ...fk(Sequelize, 'vendorId', 'vendors', 'CASCADE', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'warehouses_vendorId', fields: ['vendorId'] }
      ]
    )

    // --- 10. categories (src/database/models/category.ts) ---------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'categories',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        code: { type: STRING, allowNull: true },
        name: { type: STRING, allowNull: false },
        vendorId: { ...fk(Sequelize, 'vendorId', 'vendors', 'CASCADE', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [{ name: 'categories_vendorId', fields: ['vendorId'] }]
    )

    // --- 11. units (src/database/models/units.ts) -------------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'units',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        name: { type: STRING, allowNull: false },
        vendorId: { ...fk(Sequelize, 'vendorId', 'vendors', 'NO ACTION', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [{ name: 'units_vendorId', fields: ['vendorId'] }]
    )

    // --- 12. tags (src/database/models/tag.ts) -----------------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'tags',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        name: { type: STRING, allowNull: false },
        vendorId: { ...fk(Sequelize, 'vendorId', 'vendors', 'CASCADE', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [{ name: 'tags_vendorId', fields: ['vendorId'] }]
    )

    // --- 13. productAttributes (src/database/models/productAttribute.ts) ---------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'productAttributes',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        vendorId: { ...fk(Sequelize, 'vendorId', 'vendors', 'NO ACTION', 'CASCADE'), allowNull: true },
        name: { type: STRING, allowNull: false },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [{ name: 'productAttributes_vendorId', fields: ['vendorId'] }]
    )

    // --- 14. productAttributeValues (src/database/models/productAttributeValue.ts)
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'productAttributeValues',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        value: { type: STRING, allowNull: false },
        attributeId: { ...fk(Sequelize, 'attributeId', 'productAttributes', 'CASCADE', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'productAttributeValues_attributeId_value', fields: ['attributeId', 'value'], options: { unique: true } },
        { name: 'productAttributeValues_attributeId', fields: ['attributeId'] }
      ]
    )

    // --- 15. products (src/database/models/product.ts, paranoid) -----------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'products',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        name: { type: STRING, allowNull: false },
        description: { type: STRING, allowNull: true },
        type: { type: INTEGER, allowNull: false, defaultValue: 0 },
        unitId: { ...fk(Sequelize, 'unitId', 'units', 'SET NULL', 'CASCADE'), allowNull: true },
        vendorId: { ...fk(Sequelize, 'vendorId', 'vendors', 'SET NULL', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false },
        deletedAt: { type: DATE, allowNull: true }
      },
      {},
      [
        { name: 'products_vendorId', fields: ['vendorId'] },
        { name: 'products_unitId', fields: ['unitId'] }
      ]
    )

    // --- 16. product_categories (src/database/models/product_category.ts) ---------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'product_categories',
      {
        categoryId: { ...fk(Sequelize, 'categoryId', 'categories', 'CASCADE', 'CASCADE'), allowNull: true },
        productId: { ...fk(Sequelize, 'productId', 'products', 'CASCADE', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'product_categories_categoryId', fields: ['categoryId'] },
        { name: 'product_categories_productId', fields: ['productId'] }
      ]
    )

    // --- 17. product_tags (join table via Tag/Product @BelongsToMany) ---------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'product_tags',
      {
        productId: { ...fk(Sequelize, 'productId', 'products', 'CASCADE', 'CASCADE'), allowNull: true },
        tagId: { ...fk(Sequelize, 'tagId', 'tags', 'CASCADE', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'product_tags_productId', fields: ['productId'] },
        { name: 'product_tags_tagId', fields: ['tagId'] }
      ]
    )

    // --- 18. productVariants (src/database/models/productVariant.ts, paranoid) -----
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'productVariants',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        productId: { ...fk(Sequelize, 'productId', 'products', 'CASCADE', 'CASCADE'), allowNull: false },
        code: { type: STRING, allowNull: true },
        skuCode: { type: STRING, allowNull: false },
        salePrice: { type: BIGINT, allowNull: true },
        regularPrice: { type: BIGINT, allowNull: true },
        wholeSalePrice: { type: BIGINT, allowNull: true },
        costPrice: { type: INTEGER, allowNull: true },
        VAT: { type: INTEGER, allowNull: true, defaultValue: 0 },
        sold: { type: INTEGER, allowNull: true, defaultValue: 0 },
        imageUrl: { type: STRING, allowNull: true },
        isActive: { type: BOOLEAN, allowNull: false, defaultValue: true },
        isNegative: { type: BOOLEAN, allowNull: false, defaultValue: false },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false },
        deletedAt: { type: DATE, allowNull: true }
      },
      {},
      [
        { name: 'productVariants_productId_skuCode', fields: ['productId', 'skuCode'], options: { unique: true } },
        { name: 'productVariants_skuCode', fields: ['skuCode'] },
        { name: 'productVariants_code', fields: ['code'] },
        { name: 'productVariants_productId', fields: ['productId'] }
      ]
    )

    // --- 19. productVariantAttributeValues (join via ProductVariant @BelongsToMany) --
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'productVariantAttributeValues',
      {
        variantId: { ...fk(Sequelize, 'variantId', 'productVariants', 'CASCADE', 'CASCADE'), allowNull: true },
        attributeValueId: {
          ...fk(Sequelize, 'attributeValueId', 'productAttributeValues', 'CASCADE', 'CASCADE'),
          allowNull: true
        },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'productVariantAttributeValues_variantId', fields: ['variantId'] },
        { name: 'productVariantAttributeValues_attributeValueId', fields: ['attributeValueId'] }
      ]
    )

    // --- 20. inventories (src/database/models/inventory.ts) -----------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'inventories',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        quantity: { type: INTEGER, allowNull: true },
        productId: { ...fk(Sequelize, 'productId', 'products', 'NO ACTION', 'CASCADE'), allowNull: true },
        variantId: { ...fk(Sequelize, 'variantId', 'productVariants', 'RESTRICT', 'CASCADE'), allowNull: false },
        warehouseId: { ...fk(Sequelize, 'warehouseId', 'warehouses', 'NO ACTION', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'inventories_variantId_warehouseId', fields: ['variantId', 'warehouseId'] },
        { name: 'inventories_productId', fields: ['productId'] },
        { name: 'inventories_warehouseId', fields: ['warehouseId'] }
      ]
    )

    // --- 21. providers (src/database/models/provider.ts) ----------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'providers',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        name: { type: STRING, allowNull: true },
        description: { type: STRING, allowNull: true },
        phone: { type: STRING, allowNull: true },
        address: { type: STRING, allowNull: true },
        email: { type: STRING, allowNull: true },
        vendorId: { ...fk(Sequelize, 'vendorId', 'vendors', 'NO ACTION', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [{ name: 'providers_vendorId', fields: ['vendorId'] }]
    )

    // --- 22. customers (src/database/models/customer.ts) -----------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'customers',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        code: { type: STRING, allowNull: true },
        name: { type: STRING, allowNull: false },
        phone: { type: STRING, allowNull: true },
        email: { type: STRING, allowNull: true },
        address: { type: STRING, allowNull: true },
        taxCode: { type: STRING, allowNull: true },
        vendorId: { ...fk(Sequelize, 'vendorId', 'vendors', 'SET NULL', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [{ name: 'customers_vendorId', fields: ['vendorId'] }]
    )

    // --- 23. orders (src/database/models/order.ts) --------------------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'orders',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        code: { type: STRING, allowNull: true },
        VAT: { type: INTEGER, allowNull: true },
        paid: { type: BIGINT, allowNull: true },
        surcharge: { type: BIGINT, allowNull: true },
        price: { type: BIGINT, allowNull: true },
        paymentType: { type: ENUM('cash', 'transfer', 'credit'), defaultValue: 'cash' },
        channel: { type: ENUM('POS', 'WHOLESALE', 'ONLINE'), allowNull: false, defaultValue: 'WHOLESALE' },
        status: {
          type: ENUM('draft', 'completed', 'partially_returned', 'returned'),
          allowNull: false,
          defaultValue: 'completed'
        },
        providerId: { ...fk(Sequelize, 'providerId', 'providers', 'NO ACTION', 'CASCADE'), allowNull: true },
        warehouseId: { ...fk(Sequelize, 'warehouseId', 'warehouses', 'NO ACTION', 'CASCADE'), allowNull: true },
        vendorId: { ...fk(Sequelize, 'vendorId', 'vendors', 'SET NULL', 'CASCADE'), allowNull: true },
        staffId: { ...fk(Sequelize, 'staffId', 'staff', 'SET NULL', 'CASCADE'), allowNull: true },
        customerId: { ...fk(Sequelize, 'customerId', 'customers', 'SET NULL', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'orders_warehouseId', fields: ['warehouseId'] },
        { name: 'orders_providerId', fields: ['providerId'] },
        { name: 'orders_vendorId', fields: ['vendorId'] },
        { name: 'orders_customerId', fields: ['customerId'] },
        { name: 'orders_status', fields: ['status'] }
      ]
    )

    // --- 24. orderDetails (src/database/models/orderDetail.ts) ---------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'orderDetails',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        quantity: { type: INTEGER, allowNull: true },
        price: { type: BIGINT, allowNull: true },
        buyPrice: { type: BIGINT, allowNull: true },
        note: { type: STRING, allowNull: true },
        warehouseId: { ...fk(Sequelize, 'warehouseId', 'warehouses', 'NO ACTION', 'CASCADE'), allowNull: true },
        productId: { ...fk(Sequelize, 'productId', 'products', 'NO ACTION', 'CASCADE'), allowNull: true },
        variantId: { ...fk(Sequelize, 'variantId', 'productVariants', 'RESTRICT', 'CASCADE'), allowNull: false },
        orderId: { ...fk(Sequelize, 'orderId', 'orders', 'CASCADE', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'orderDetails_orderId', fields: ['orderId'] },
        { name: 'orderDetails_productId', fields: ['productId'] },
        { name: 'orderDetails_warehouseId', fields: ['warehouseId'] },
        { name: 'orderDetails_variantId', fields: ['variantId'] }
      ]
    )

    // --- 25. invoices (src/database/models/invoice.ts) ---------------------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'invoices',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        invoiceNumber: { type: STRING(50), allowNull: false },
        orderId: { ...fk(Sequelize, 'orderId', 'orders', 'SET NULL', 'CASCADE'), allowNull: true },
        customerId: { ...fk(Sequelize, 'customerId', 'customers', 'SET NULL', 'CASCADE'), allowNull: true },
        vendorId: { ...fk(Sequelize, 'vendorId', 'vendors', 'SET NULL', 'CASCADE'), allowNull: true },
        warehouseId: { ...fk(Sequelize, 'warehouseId', 'warehouses', 'SET NULL', 'CASCADE'), allowNull: true },
        subtotal: { type: BIGINT, allowNull: true },
        discount: { type: BIGINT, allowNull: false, defaultValue: 0 },
        VAT: { type: INTEGER, allowNull: true },
        taxAmount: { type: BIGINT, allowNull: false, defaultValue: 0 },
        surcharge: { type: BIGINT, allowNull: false, defaultValue: 0 },
        total: { type: BIGINT, allowNull: true },
        paid: { type: BIGINT, allowNull: false, defaultValue: 0 },
        remaining: { type: BIGINT, allowNull: false, defaultValue: 0 },
        currency: { type: STRING(10), allowNull: false, defaultValue: 'VND' },
        paymentType: { type: ENUM('cash', 'transfer', 'credit'), allowNull: false, defaultValue: 'cash' },
        status: { type: ENUM('draft', 'issued', 'paid', 'cancelled'), allowNull: false, defaultValue: 'draft' },
        invoiceType: { type: ENUM('FULL', 'PARTIAL'), allowNull: false, defaultValue: 'FULL' },
        dueDate: { type: DATE, allowNull: true },
        notes: { type: TEXT, allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'invoiceNumber', fields: ['invoiceNumber'], options: { unique: true } },
        { name: 'invoices_orderId', fields: ['orderId'] },
        { name: 'invoices_customerId', fields: ['customerId'] },
        { name: 'invoices_vendorId', fields: ['vendorId'] },
        { name: 'invoices_warehouseId', fields: ['warehouseId'] },
        { name: 'invoices_status', fields: ['status'] }
      ]
    )

    // --- 26. invoiceDetails (src/database/models/invoiceDetail.ts) -----------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'invoiceDetails',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        invoiceId: { ...fk(Sequelize, 'invoiceId', 'invoices', 'CASCADE', 'CASCADE'), allowNull: false },
        orderDetailId: { ...fk(Sequelize, 'orderDetailId', 'orderDetails', 'SET NULL', 'CASCADE'), allowNull: true },
        productId: { ...fk(Sequelize, 'productId', 'products', 'SET NULL', 'CASCADE'), allowNull: true },
        variantId: { ...fk(Sequelize, 'variantId', 'productVariants', 'RESTRICT', 'CASCADE'), allowNull: false },
        quantity: { type: INTEGER, allowNull: false },
        unitPrice: { type: BIGINT, allowNull: false },
        discount: { type: BIGINT, allowNull: false, defaultValue: 0 },
        taxRate: { type: INTEGER, allowNull: false, defaultValue: 0 },
        taxAmount: { type: BIGINT, allowNull: false, defaultValue: 0 },
        subtotal: { type: BIGINT, allowNull: false },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'invoiceDetails_invoiceId', fields: ['invoiceId'] },
        { name: 'invoiceDetails_orderDetailId', fields: ['orderDetailId'] },
        { name: 'invoiceDetails_productId', fields: ['productId'] },
        { name: 'invoiceDetails_variantId', fields: ['variantId'] }
      ]
    )

    // --- 27. transfers (src/database/models/transfer.ts) -----------------------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'transfers',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        quantity: { type: INTEGER, allowNull: true },
        type: { type: ENUM('0', '1'), allowNull: true },
        status: { type: STRING, allowNull: true },
        fromWarehouseId: { ...fk(Sequelize, 'fromWarehouseId', 'warehouses', 'SET NULL', 'CASCADE'), allowNull: true },
        toWarehouseId: { ...fk(Sequelize, 'toWarehouseId', 'warehouses', 'SET NULL', 'CASCADE'), allowNull: true },
        productId: { ...fk(Sequelize, 'productId', 'products', 'NO ACTION', 'CASCADE'), allowNull: true },
        variantId: { ...fk(Sequelize, 'variantId', 'productVariants', 'RESTRICT', 'CASCADE'), allowNull: false },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'transfers_fromWarehouseId', fields: ['fromWarehouseId'] },
        { name: 'transfers_toWarehouseId', fields: ['toWarehouseId'] },
        { name: 'transfers_productId', fields: ['productId'] },
        { name: 'transfers_variantId', fields: ['variantId'] }
      ]
    )

    // --- 28. order_returns (src/database/models/orderReturn.ts) -----------------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'order_returns',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        code: { type: STRING, allowNull: false },
        orderId: { ...fk(Sequelize, 'orderId', 'orders', 'CASCADE', 'CASCADE'), allowNull: false },
        warehouseId: { ...fk(Sequelize, 'warehouseId', 'warehouses', 'SET NULL', 'CASCADE'), allowNull: true },
        staffId: { ...fk(Sequelize, 'staffId', 'staff', 'SET NULL', 'CASCADE'), allowNull: true },
        vendorId: { type: INTEGER, allowNull: true },
        items: { type: TEXT, allowNull: true },
        refundAmount: { type: BIGINT, allowNull: false, defaultValue: 0 },
        reason: { type: STRING, allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'order_returns_orderId', fields: ['orderId'] },
        { name: 'order_returns_vendorId', fields: ['vendorId'] }
      ]
    )

    // --- 29. stocktakes (src/database/models/stocktake.ts) ----------------------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'stocktakes',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        code: { type: STRING, allowNull: false },
        warehouseId: { ...fk(Sequelize, 'warehouseId', 'warehouses', 'CASCADE', 'CASCADE'), allowNull: false },
        vendorId: { type: INTEGER, allowNull: true },
        staffId: { ...fk(Sequelize, 'staffId', 'staff', 'SET NULL', 'CASCADE'), allowNull: true },
        status: { type: ENUM('open', 'completed', 'cancelled'), allowNull: false, defaultValue: 'open' },
        note: { type: TEXT, allowNull: true },
        completedAt: { type: DATE, allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'stocktakes_warehouseId_status', fields: ['warehouseId', 'status'] },
        { name: 'stocktakes_vendorId', fields: ['vendorId'] }
      ]
    )

    // --- 30. stocktake_details (src/database/models/stocktakeDetail.ts) ------------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'stocktake_details',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        stocktakeId: { ...fk(Sequelize, 'stocktakeId', 'stocktakes', 'CASCADE', 'CASCADE'), allowNull: false },
        productId: { ...fk(Sequelize, 'productId', 'products', 'NO ACTION', 'CASCADE'), allowNull: false },
        variantId: { ...fk(Sequelize, 'variantId', 'productVariants', 'RESTRICT', 'CASCADE'), allowNull: false },
        expectedQuantity: { type: INTEGER, allowNull: false, defaultValue: 0 },
        actualQuantity: { type: INTEGER, allowNull: true },
        note: { type: STRING, allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [{ name: 'stocktake_details_stocktakeId', fields: ['stocktakeId'] }]
    )

    // --- 31. financial_records (src/database/models/financialRecord.ts) --------------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'financial_records',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        code: { type: STRING, allowNull: false },
        type: { type: ENUM('revenue', 'expense'), allowNull: false },
        category: { type: STRING, allowNull: false, defaultValue: 'other' },
        amount: { type: BIGINT, allowNull: false, defaultValue: 0 },
        note: { type: STRING, allowNull: true },
        relatedType: { type: STRING, allowNull: true },
        relatedId: { type: INTEGER, allowNull: true },
        staffId: { ...fk(Sequelize, 'staffId', 'staff', 'SET NULL', 'CASCADE'), allowNull: true },
        warehouseId: { ...fk(Sequelize, 'warehouseId', 'warehouses', 'SET NULL', 'CASCADE'), allowNull: true },
        transactionDate: { type: DATE, allowNull: false, defaultValue: Sequelize.NOW },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [
        { name: 'financial_records_staffId', fields: ['staffId'] },
        { name: 'financial_records_warehouseId', fields: ['warehouseId'] },
        { name: 'financial_records_type', fields: ['type'] }
      ]
    )

    // --- 32. shifts (src/database/models/shift.ts) -------------------------------------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'shifts',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        code: { type: STRING, allowNull: false },
        staffId: { ...fk(Sequelize, 'staffId', 'staff', 'SET NULL', 'CASCADE'), allowNull: true },
        openTime: { type: DATE, allowNull: false, defaultValue: Sequelize.NOW },
        closeTime: { type: DATE, allowNull: true },
        openingCash: { type: BIGINT, allowNull: false, defaultValue: 0 },
        closingCash: { type: BIGINT, allowNull: true },
        expectedCash: { type: BIGINT, allowNull: true },
        actualCash: { type: BIGINT, allowNull: true },
        difference: { type: BIGINT, allowNull: true },
        status: { type: ENUM('open', 'closed'), allowNull: false, defaultValue: 'open' },
        note: { type: STRING, allowNull: true },
        warehouseId: { ...fk(Sequelize, 'warehouseId', 'warehouses', 'SET NULL', 'CASCADE'), allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [{ name: 'shifts_warehouseId', fields: ['warehouseId'] }]
    )

    // --- 33. settings (src/database/models/setting.ts) ------------------------------------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'settings',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        vendorId: { ...fk(Sequelize, 'vendorId', 'vendors', 'SET NULL', 'CASCADE'), allowNull: true },
        payment: { type: STRING, allowNull: true },
        language: { type: STRING(10), defaultValue: 'vi' },
        theme: { type: STRING(20), defaultValue: 'system' },
        moneyUnit: { type: STRING(10), defaultValue: 'VND' },
        moneyUnitPosition: { type: STRING(10), defaultValue: 'suffix' },
        skuTemplate: { type: STRING, defaultValue: '{CODE}' },
        codePrefix: { type: TEXT, allowNull: true },
        codeSuffix: { type: TEXT, allowNull: true },
        shipDelivery: { type: TEXT, allowNull: true },
        defaultTaxRate: { type: INTEGER, defaultValue: 0 },
        defaultDiscount: { type: BIGINT, defaultValue: 0 },
        defaultSurcharge: { type: BIGINT, defaultValue: 0 },
        moneyStep: { type: BIGINT, defaultValue: 1000 },
        appearance: { type: TEXT, allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [{ name: 'settings_vendorId', fields: ['vendorId'] }]
    )

    // --- 34. sequences (src/database/models/sequence.ts) -------------------------------------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'sequences',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        scopeKey: { type: STRING(100), allowNull: false },
        year: { type: INTEGER, allowNull: true },
        seq: { type: INTEGER, allowNull: false, defaultValue: 0 },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [{ name: 'sequences_scopeKey_year', fields: ['scopeKey', 'year'], options: { unique: true } }]
    )

    // --- 35. vendor_histories (src/database/models/vendorHistory.ts) ---------------------------------------------
    await createTableIfMissing(
      queryInterface,
      Sequelize,
      'vendor_histories',
      {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        vendorId: { ...fk(Sequelize, 'vendorId', 'vendors', 'CASCADE', 'CASCADE'), allowNull: false },
        changedBy: { type: INTEGER, allowNull: true },
        changes: { type: TEXT, allowNull: true },
        createdAt: { type: DATE, allowNull: false },
        updatedAt: { type: DATE, allowNull: false }
      },
      {},
      [{ name: 'vendor_histories_vendorId', fields: ['vendorId'] }]
    )

    console.log('initial-schema: done')
  },

  async down(queryInterface) {
    // Reverse dependency order (children before parents).
    for (const table of [
      'vendor_histories',
      'sequences',
      'settings',
      'shifts',
      'financial_records',
      'stocktake_details',
      'stocktakes',
      'order_returns',
      'transfers',
      'invoiceDetails',
      'invoices',
      'orderDetails',
      'orders',
      'customers',
      'providers',
      'inventories',
      'productVariantAttributeValues',
      'productVariants',
      'product_tags',
      'product_categories',
      'products',
      'productAttributeValues',
      'productAttributes',
      'tags',
      'units',
      'categories',
      'warehouses',
      'staff_vendor',
      'staff',
      'user_roles',
      'role_permissions',
      'permissions',
      'roles',
      'vendors',
      'users'
    ]) {
      if (await tableExists(queryInterface, table)) {
        await queryInterface.dropTable(table)
        console.log(`initial-schema: dropped ${table}`)
      }
    }
  }
}