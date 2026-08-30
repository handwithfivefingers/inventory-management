import { vi } from 'vitest'

const db = vi.hoisted(() => {
  const MODEL_METHODS = [
    'findOne',
    'findAll',
    'findAndCountAll',
    'create',
    'build',
    'update',
    'destroy',
    'findByPk',
    'count',
    'bulkCreate',
    'findOrCreate'
  ]
  const makeModelMock = () => {
    const m: any = {}
    for (const method of MODEL_METHODS) m[method] = vi.fn()
    return m
  }
  const models = [
    'user',
    'role',
    'vendor',
    'warehouse',
    'product',
    'inventory',
    'transfer',
    'category',
    'tag',
    'unit',
    'permission',
    'customer',
    'provider',
    'staff',
    'shift',
    'order',
    'orderDetail',
    'invoice',
    'invoiceDetail',
    'financialRecord',
    'setting',
    'units',
    'user_role',
    'role_permission',
    'productVariant',
    'productAttribute',
    'productAttributeValue',
    'sequence'
  ]
  const database: any = {}
  for (const name of models) database[name] = makeModelMock()
  database.sequelize = {
    transaction: vi.fn(),
    literal: vi.fn((v: any) => v),
    col: vi.fn((v: any) => v),
    query: vi.fn()
  }
  return database
})

vi.mock('#/database', () => ({ default: db }))
// Product service imports models directly; map them to the same mocked instances
vi.mock('#/database/models/product', () => ({ default: db.product, Product: db.product }))
vi.mock('#/database/models/inventory', () => ({ default: db.inventory, Inventory: db.inventory }))
vi.mock('#/database/models/category', () => ({ default: db.category, Category: db.category }))
vi.mock('#/database/models/tag', () => ({ default: db.tag, Tag: db.tag }))
vi.mock('#/database/models/units', () => ({ default: db.units, Unit: db.units }))
vi.mock('#/database/models/productVariant', () => ({ default: db.productVariant, ProductVariant: db.productVariant }))
vi.mock('#/database/models/productAttribute', () => ({ default: db.productAttribute, ProductAttribute: db.productAttribute }))
vi.mock('#/database/models/productAttributeValue', () => ({ default: db.productAttributeValue, ProductAttributeValue: db.productAttributeValue }))
vi.mock('#/database/models/transfer', () => ({ default: db.transfer, Transfer: db.transfer }))
