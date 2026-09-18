import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => {
  const model = () => ({ findAll: vi.fn(), count: vi.fn() })
  return {
    order: model(),
    orderDetail: model(),
    inventory: model(),
    product: {},
    productVariant: {},
    warehouse: {},
    sequelize: {
      col: vi.fn((value: string) => value),
      fn: vi.fn((name: string, value: string, format?: string) => `${name}(${value}${format ? `, ${format}` : ''})`),
      literal: vi.fn((value: string) => value)
    }
  }
})

vi.mock('#/database', () => ({ default: db }))

import StatsService from '../index'

beforeEach(() => {
  vi.clearAllMocks()
  db.order.findAll.mockResolvedValue([])
  db.orderDetail.findAll.mockResolvedValue([])
  db.inventory.count.mockResolvedValue(0)
  db.inventory.findAll.mockResolvedValue([])
})

describe('StatsService dashboard low-stock query', () => {
  it('reads sellable identifiers from variants and includes variant inventory', async () => {
    await new StatsService().getDashboard({ days: '7' })

    const query = db.inventory.findAll.mock.calls[0][0]
    expect(query.where).not.toHaveProperty('variantId')
    expect(query.include).toEqual([
      { model: db.product, attributes: ['id', 'name'] },
      { model: db.productVariant, attributes: ['id', 'code', 'skuCode'], required: false },
      { model: db.warehouse, attributes: ['id', 'name'] }
    ])
  })
})
