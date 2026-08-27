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
    'role_permission'
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
