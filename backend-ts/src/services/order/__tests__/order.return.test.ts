import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Unit tests for OrderService.returnOrder — the order-returns feature.
 * All Sequelize models are mocked; transactions are simulated with
 * commit/rollback spies. Verifies:
 *  - happy path (partial return): stock IN, sold decrement, return doc,
 *    refund voucher, status -> partially_returned
 *  - full return flips status to 'returned'
 *  - over-return, import orders, already-returned orders are rejected
 *  - explicit refundAmount override skips the voucher
 */

const db = vi.hoisted(() => {
  const MODEL_METHODS = ['findOne', 'findAll', 'findByPk', 'create', 'build', 'count']
  const mk = () => {
    const m: any = {}
    for (const k of MODEL_METHODS) m[k] = vi.fn()
    return m
  }
  return {
    sequelize: { transaction: vi.fn() },
    transfer: { build: vi.fn() },
    order: mk(),
    orderDetail: mk(),
    warehouse: mk(),
    product: mk()
  }
})

const orderModel = vi.hoisted(() => ({ findByPk: vi.fn() }))
const orderDetailModel = vi.hoisted(() => ({ findAll: vi.fn() }))
const orderReturnModel = vi.hoisted(() => ({ create: vi.fn(), findAll: vi.fn() }))
const financialModel = vi.hoisted(() => ({ create: vi.fn() }))
const productModel = vi.hoisted(() => ({ findByPk: vi.fn(), decrement: vi.fn() }))
const productVariantModel = vi.hoisted(() => ({ findByPk: vi.fn(), decrement: vi.fn() }))
const inventoryModel = vi.hoisted(() => ({ findOne: vi.fn(), increment: vi.fn() }))

vi.mock('#/database', () => ({ default: db }))
vi.mock('#/database/models/order', () => ({ default: orderModel, Order: orderModel }))
vi.mock('#/database/models/orderDetail', () => ({ default: orderDetailModel, OrderDetail: orderDetailModel }))
vi.mock('#/database/models/orderReturn', () => ({ default: orderReturnModel, OrderReturn: orderReturnModel }))
vi.mock('#/database/models/financialRecord', () => ({ default: financialModel, FinancialRecord: financialModel }))
vi.mock('#/database/models/product', () => ({ default: productModel, Product: productModel }))
vi.mock('#/database/models/productVariant', () => ({ default: productVariantModel, ProductVariant: productVariantModel }))
vi.mock('#/database/models/inventory', () => ({ default: inventoryModel, Inventory: inventoryModel }))

import OrderService from '#/services/order'

const tx = { commit: vi.fn(), rollback: vi.fn() }
const makeRow = (fields: Record<string, any>) => ({
  ...fields,
  get: (key: string) => fields[key],
  update: vi.fn(async (patch: any) => Object.assign(fields, patch)),
  increment: vi.fn(),
  save: vi.fn()
})

const req = (body: any, params: any = {}) =>
  ({
    body,
    params: { id: 9, ...params },
    query: {},
    user: { vendorIds: [3] }
  }) as any

const buildOrder = (overrides: Record<string, any> = {}) =>
  makeRow({
    id: 9,
    code: 'ORD-1',
    warehouseId: 5,
    vendorId: 3,
    providerId: null,
    status: 'completed',
    ...overrides
  })

const buildDetail = (overrides: Record<string, any> = {}) =>
  makeRow({ id: 101, orderId: 9, productId: 42, variantId: 33, quantity: 2, price: 10000, ...overrides })

beforeEach(() => {
  vi.clearAllMocks()
  db.sequelize.transaction.mockResolvedValue(tx)
  // tenant.assertWarehouseAccess resolves warehouses through database.warehouse
  db.warehouse.findByPk.mockResolvedValue({ vendorId: 3 })
  orderModel.findByPk.mockResolvedValue(null)
  orderDetailModel.findAll.mockResolvedValue([])
  orderReturnModel.findAll.mockResolvedValue([])
  // default: stock exists and decrement affects 1 row
  inventoryModel.findOne.mockResolvedValue(makeRow({ quantity: 10 }))
  inventoryModel.increment.mockResolvedValue([undefined, 1])
  productModel.findByPk.mockResolvedValue(makeRow({ id: 42, name: 'P', isNegative: false }))
  productModel.decrement.mockResolvedValue([[undefined, 1]])
  productVariantModel.decrement.mockResolvedValue([[undefined, 1]])
  // TransferService.create -> database.transfer.build().save()
  db.transfer.build.mockReturnValue({ save: vi.fn(async () => ({})) })
  orderReturnModel.create.mockResolvedValue(makeRow({ id: 77, code: 'RET-x' }))
  financialModel.create.mockResolvedValue({})
})

describe('OrderService.returnOrder', () => {
  it('returns part of an order: stock IN + sold decrement + doc + refund + partial status', async () => {
    const order = buildOrder()
    const detail = buildDetail()
    orderModel.findByPk.mockResolvedValue(order)
    orderDetailModel.findAll.mockResolvedValue([detail])

    const svc = new OrderService()
    const result = await svc.returnOrder(req({ items: [{ orderDetailId: 101, quantity: 1 }], reason: 'damaged' }))

    expect(result.status).toBe('partially_returned')
    expect(result.refundAmount).toBe(10000)
    // stock flows back (IN transfer type '0')
    expect(inventoryModel.increment).toHaveBeenCalled()
    expect(db.transfer.build).toHaveBeenCalled()
    // sold counter decremented (variant is the only stored counter now)
    expect(productVariantModel.decrement).toHaveBeenCalled()
    expect(productModel.decrement).not.toHaveBeenCalled()
    // return document snapshots the line
    expect(orderReturnModel.create).toHaveBeenCalledTimes(1)
    const docArg = orderReturnModel.create.mock.calls[0][0]
    expect(docArg.orderId).toBe(9)
    expect(docArg.refundAmount).toBe(10000)
    expect(JSON.parse(docArg.items)).toEqual([
      expect.objectContaining({ orderDetailId: 101, productId: 42, quantity: 1, price: 10000 })
    ])
    // refund voucher booked
    expect(financialModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'expense', category: 'return', amount: 10000, relatedId: 77 }),
      expect.anything()
    )
    // order status updated + committed
    expect(order.update).toHaveBeenCalledWith({ status: 'partially_returned' }, { transaction: tx })
    expect(tx.commit).toHaveBeenCalled()
    expect(tx.rollback).not.toHaveBeenCalled()
  })

  it('flips status to "returned" when every line is fully returned', async () => {
    const order = buildOrder()
    const detail = buildDetail({ quantity: 2 })
    orderModel.findByPk.mockResolvedValue(order)
    orderDetailModel.findAll.mockResolvedValue([detail])

    const svc = new OrderService()
    const result = await svc.returnOrder(req({ items: [{ orderDetailId: 101, quantity: 2 }] }))

    expect(result.status).toBe('returned')
    expect(order.update).toHaveBeenCalledWith({ status: 'returned' }, { transaction: tx })
  })

  it('caps the returnable quantity across prior returns', async () => {
    const order = buildOrder()
    const detail = buildDetail({ quantity: 2 })
    orderModel.findByPk.mockResolvedValue(order)
    orderDetailModel.findAll.mockResolvedValue([detail])
    // one unit was already returned earlier
    orderReturnModel.findAll.mockResolvedValue([makeRow({ items: JSON.stringify([{ orderDetailId: 101, quantity: 1 }]) })])

    const svc = new OrderService()
    await expect(svc.returnOrder(req({ items: [{ orderDetailId: 101, quantity: 2 }] }))).rejects.toThrow(
      /only 1 remaining/
    )
    expect(tx.rollback).toHaveBeenCalled()
    expect(orderReturnModel.create).not.toHaveBeenCalled()
  })

  it('rejects import (provider) orders', async () => {
    orderModel.findByPk.mockResolvedValue(buildOrder({ providerId: 5 }))
    const svc = new OrderService()
    await expect(svc.returnOrder(req({ items: [{ orderDetailId: 101, quantity: 1 }] }))).rejects.toThrow(
      /Import orders cannot be returned/
    )
  })

  it('rejects a fully returned order', async () => {
    orderModel.findByPk.mockResolvedValue(buildOrder({ status: 'returned' }))
    const svc = new OrderService()
    await expect(svc.returnOrder(req({ items: [{ orderDetailId: 101, quantity: 1 }] }))).rejects.toThrow(
      /already been fully returned/
    )
  })

  it('rejects unknown order detail lines', async () => {
    orderModel.findByPk.mockResolvedValue(buildOrder())
    orderDetailModel.findAll.mockResolvedValue([buildDetail()])
    const svc = new OrderService()
    await expect(svc.returnOrder(req({ items: [{ orderDetailId: 999, quantity: 1 }] }))).rejects.toThrow(
      /Order detail 999 not found/
    )
  })

  it('requires a positive quantity and non-empty items', async () => {
    orderModel.findByPk.mockResolvedValue(buildOrder())
    orderDetailModel.findAll.mockResolvedValue([buildDetail()])
    const svc = new OrderService()
    await expect(svc.returnOrder(req({ items: [] }))).rejects.toThrow('items are required')
    await expect(svc.returnOrder(req({ items: [{ orderDetailId: 101, quantity: 0 }] }))).rejects.toThrow(
      /must be positive/
    )
  })

  it('uses the explicit refundAmount override without booking a zero voucher', async () => {
    const order = buildOrder()
    orderModel.findByPk.mockResolvedValue(order)
    orderDetailModel.findAll.mockResolvedValue([buildDetail()])
    const svc = new OrderService()
    const result = await svc.returnOrder(req({ items: [{ orderDetailId: 101, quantity: 1 }], refundAmount: 8000 }))
    expect(result.refundAmount).toBe(8000)
    expect(financialModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 8000 }),
      expect.anything()
    )
  })

  it('skips the refund voucher entirely when refund is 0', async () => {
    const order = buildOrder()
    orderModel.findByPk.mockResolvedValue(order)
    orderDetailModel.findAll.mockResolvedValue([buildDetail({ price: 0 })])
    const svc = new OrderService()
    await svc.returnOrder(req({ items: [{ orderDetailId: 101, quantity: 1 }] }))
    expect(financialModel.create).not.toHaveBeenCalled()
  })

  it('rolls back on internal failure and rethrows as ApiError', async () => {
    orderModel.findByPk.mockResolvedValue(buildOrder())
    orderDetailModel.findAll.mockResolvedValue([buildDetail()])
    inventoryModel.increment.mockRejectedValue(new Error('db down'))
    const svc = new OrderService()
    await expect(svc.returnOrder(req({ items: [{ orderDetailId: 101, quantity: 1 }] }))).rejects.toThrow()
    expect(tx.rollback).toHaveBeenCalled()
    expect(tx.commit).not.toHaveBeenCalled()
  })
})

export {}
