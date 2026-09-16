import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => {
  const MODEL_METHODS = ['findOne', 'findAll', 'findAndCountAll', 'create', 'build', 'update', 'destroy', 'findByPk', 'count', 'bulkCreate']
  const makeModelMock = () => {
    const m: any = {}
    for (const method of MODEL_METHODS) m[method] = vi.fn()
    return m
  }
  const models = ['user', 'role', 'vendor', 'warehouse', 'product', 'inventory', 'transfer', 'category', 'tag', 'unit', 'permission', 'customer', 'provider', 'staff', 'shift', 'order', 'orderDetail', 'invoice', 'invoiceDetail', 'financialRecord', 'setting', 'units', 'productVariant', 'productAttribute', 'productAttributeValue']
  const database: any = {}
  for (const name of models) database[name] = makeModelMock()
  database.sequelize = {
    transaction: vi.fn(),
    query: vi.fn(),
    literal: vi.fn((v: any) => v),
    col: vi.fn((v: any) => v),
    fn: vi.fn((...args: any[]) => args),
  }
  return database
})

vi.mock('#/database', () => ({ default: db }))

import { InvoiceService } from '../index'

const makeTx = () => ({ commit: vi.fn(), rollback: vi.fn() })

const setup = (orderDetails: any[], invoicedRows: any[] = [], priorCount = 0) => {
  const order: any = {
    id: 10,
    vendorId: 7,
    warehouseId: 1,
    customerId: 3,
    VAT: 5,
    surcharge: 1000,
    paymentType: 'cash',
    orderDetails,
  }
  db.order.findByPk.mockResolvedValue(order)
  db.warehouse.findByPk.mockResolvedValue({ id: 1, vendorId: 7, name: 'Main' })
  db.invoiceDetail.findAll.mockResolvedValue(invoicedRows)
  db.invoice.count.mockResolvedValue(priorCount)
  db.invoice.findOne.mockResolvedValue(null)
  db.vendor.findByPk.mockResolvedValue({ name: 'Acme Corp' })
  let seq = 0
  db.sequelize.query.mockImplementation(async (sql: string) => {
    if (String(sql).includes('LAST_INSERT_ID()')) {
      seq += 1
      return [[{ seq }], []]
    }
    return [[], []]
  })
  const createdDetails: any[] = []
  db.invoice.create.mockImplementation(async (payload: any) => ({ id: 100, ...payload }))
  db.invoiceDetail.create.mockImplementation(async (payload: any) => {
    createdDetails.push(payload)
    return payload
  })
  db.invoice.findByPk.mockImplementation(async (id: number) => ({ id }))
  db.financialRecord.create.mockResolvedValue({})
  return { order, createdDetails }
}

describe('InvoiceService.createFromOrderLines (per-line requirement)', () => {
  let service: InvoiceService

  beforeEach(() => {
    vi.clearAllMocks()
    db.sequelize.transaction.mockImplementation(async () => makeTx())
    service = new InvoiceService()
  })

  it('rejects quantity exceeding remaining (ordered 5, invoiced 2, request 4)', async () => {
    setup(
      [{ id: 11, productId: 1, quantity: 5, price: 100, variantId: null }],
      [{ orderDetailId: 11, invoicedQty: 2 }]
    )
    await expect(
      service.createFromOrderLines(10, [{ order_detail_id: 11, quantity: 4 }], {}, [7])
    ).rejects.toThrow(/exceeds remaining 3/)
  })

  it('auto FULL when covering all remaining of every line', async () => {
    const { createdDetails } = setup(
      [
        { id: 11, productId: 1, quantity: 5, price: 100, variantId: null },
        { id: 12, productId: 2, quantity: 8, price: 50, variantId: null },
      ],
      [{ orderDetailId: 11, invoicedQty: 2 }]
    )
    await service.createFromOrderLines(
      10,
      [
        { order_detail_id: 11, quantity: 3 },
        { order_detail_id: 12, quantity: 8 },
      ],
      {},
      [7]
    )
    expect(db.invoice.create).toHaveBeenCalledWith(expect.objectContaining({ invoiceType: 'FULL' }), expect.anything())
    expect(createdDetails).toHaveLength(2)
    expect(createdDetails[0]).toMatchObject({ orderDetailId: 11, quantity: 3, productId: 1 })
    expect(createdDetails[1]).toMatchObject({ orderDetailId: 12, quantity: 8, productId: 2 })
  })

  it('auto PARTIAL when only a subset is invoiced', async () => {
    setup(
      [
        { id: 11, productId: 1, quantity: 5, price: 100, variantId: null },
        { id: 12, productId: 2, quantity: 8, price: 50, variantId: null },
      ],
      []
    )
    await service.createFromOrderLines(10, [{ order_detail_id: 11, quantity: 2 }], {}, [7])
    expect(db.invoice.create).toHaveBeenCalledWith(expect.objectContaining({ invoiceType: 'PARTIAL' }), expect.anything())
  })

  it('allows a second invoice for the same order (no single-invoice guard)', async () => {
    setup(
      [{ id: 11, productId: 1, quantity: 5, price: 100, variantId: null }],
      [{ orderDetailId: 11, invoicedQty: 2 }],
      1
    )
    await service.createFromOrderLines(10, [{ order_detail_id: 11, quantity: 3 }], {}, [7])
    expect(db.invoice.create).toHaveBeenCalledTimes(1)
  })

  it('rejects empty lines when nothing remains', async () => {
    setup(
      [{ id: 11, productId: 1, quantity: 2, price: 100, variantId: null }],
      [{ orderDetailId: 11, invoicedQty: 2 }]
    )
    // one-click fallback (no lines) with zero remaining
    await expect(service.createFromOrderLines(10, [], {}, [7])).rejects.toThrow(/No remaining quantity/)
  })

  it('rejects duplicate lines and unknown order_detail_id', async () => {
    setup([{ id: 11, productId: 1, quantity: 5, price: 100, variantId: null }])
    await expect(
      service.createFromOrderLines(
        10,
        [
          { order_detail_id: 11, quantity: 1 },
          { order_detail_id: 11, quantity: 1 },
        ],
        {},
        [7]
      )
    ).rejects.toThrow(/Duplicate line/)
    await expect(service.createFromOrderLines(10, [{ order_detail_id: 999, quantity: 1 }], {}, [7])).rejects.toThrow(
      /not on this order/
    )
  })

  it('uses caller transaction without commit (POS single-tx)', async () => {
    const externalTx = makeTx()
    setup([{ id: 11, productId: 1, quantity: 2, price: 100, variantId: null }])
    await service.createFromOrderLines(10, [{ order_detail_id: 11, quantity: 2 }], {}, [7], externalTx)
    expect(externalTx.commit).not.toHaveBeenCalled()
    expect(db.sequelize.transaction).not.toHaveBeenCalled()
  })
})
