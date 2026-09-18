import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => {
  const model = () => ({
    findAll: vi.fn(),
    findByPk: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    build: vi.fn()
  })
  return {
    productAttribute: model(),
    productAttributeValue: model(),
    productVariant: model(),
    order: model(),
    orderDetail: model(),
    invoice: model(),
    invoiceDetail: model(),
    setting: model(),
    inventory: model(),
    transfer: model(),
    sequelize: { transaction: vi.fn() }
  }
})

vi.mock('#/database', () => ({ default: db }))
vi.mock('#/database/models/productAttribute', () => ({
  default: db.productAttribute,
  ProductAttribute: db.productAttribute
}))
vi.mock('#/database/models/productAttributeValue', () => ({
  default: db.productAttributeValue,
  ProductAttributeValue: db.productAttributeValue
}))
vi.mock('#/database/models/productVariant', () => ({ default: db.productVariant, ProductVariant: db.productVariant }))
vi.mock('#/database/models/setting', () => ({ default: db.setting, Setting: db.setting }))
vi.mock('#/database/models/inventory', () => ({ default: db.inventory, Inventory: db.inventory }))
vi.mock('#/database/models/transfer', () => ({ default: db.transfer, Transfer: db.transfer }))
vi.mock('#/database/models/order', () => ({ default: db.order, Order: db.order }))
vi.mock('#/database/models/orderDetail', () => ({ default: db.orderDetail, OrderDetail: db.orderDetail }))
vi.mock('#/database/models/invoice', () => ({ default: db.invoice, Invoice: db.invoice }))
vi.mock('#/database/models/invoiceDetail', () => ({ default: db.invoiceDetail, InvoiceDetail: db.invoiceDetail }))
vi.mock('#/utils/entity-cache', () => ({
  getCachedEntity: vi.fn((_model: string, _id: unknown, loader: () => Promise<unknown>) => loader()),
  setCachedEntity: vi.fn(),
  evictCachedEntity: vi.fn()
}))

import { assertNoProcessingOrders } from '../index'
import { applyVariantSync, createVariants } from '../product-variant'

const tx = {} as any
const row = (data: Record<string, any>) => ({
  ...data,
  get: (key: string) => data[key],
  update: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn().mockResolvedValue(undefined),
  $set: vi.fn().mockResolvedValue(undefined)
})

describe('variant transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.productVariant.findOne.mockResolvedValue(null)
    db.productAttribute.findAll.mockResolvedValue([])
    db.productAttributeValue.findAll.mockResolvedValue([])
    db.setting.findOne.mockResolvedValue(null)
  })

  it('creates variants from option names and preserves barcode, SKU and variant fields', async () => {
    const attribute = { id: 5, name: 'Color', vendorId: 1 }
    const value = { id: 11, value: 'Red', attributeId: 5, attribute }
    db.productAttribute.findAll.mockResolvedValue([attribute])
    db.productAttributeValue.findAll.mockResolvedValueOnce([value]).mockResolvedValueOnce([value])
    const created = row({ id: 20 })
    db.productVariant.create.mockResolvedValue(created)
    db.inventory.build.mockImplementation((data: any) => {
      const value = { dataValues: data }
      return { ...value, save: vi.fn().mockResolvedValue(value) }
    })
    db.transfer.build.mockImplementation((data: any) => {
      const value = { dataValues: data }
      return { ...value, save: vi.fn().mockResolvedValue(value) }
    })

    await createVariants(
      [{ options: { Color: 'Red' }, code: '123456789012', skuCode: 'red-shirt', quantity: 4, VAT: 10, imageUrl: 'x' }],
      {
        productId: 7,
        vendorId: 1,
        warehouseId: 2,
        baseSku: 'BASE-SKU',
        baseCode: '123456789013',
        skuTemplate: undefined,
        transaction: tx
      }
    )

    expect(db.productVariant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 7,
        code: '123456789012',
        skuCode: 'RED-SHIRT',
        VAT: 10,
        imageUrl: 'x'
      }),
      { transaction: tx }
    )
  })

  it('uses the existing variant as the update base when converting simple to variant', async () => {
    const old = row({ id: 3, productId: 7, code: '123456789013', skuCode: 'BASE-SKU', deletedAt: new Date() })
    const attribute = { id: 5, name: 'Color', vendorId: 1 }
    const value = { id: 11, value: 'Red', attributeId: 5, attribute }
    db.productVariant.findByPk.mockResolvedValue(old)
    db.productVariant.findAll
      .mockResolvedValueOnce([old]) // active original simple row is preserved
      .mockResolvedValueOnce([]) // no deleted rows
    db.productAttribute.findAll.mockResolvedValue([attribute])
    db.productAttributeValue.findAll.mockResolvedValue([value])
    db.productVariant.build.mockImplementation((data: any) => ({
      ...row(data),
      get: (key: string) => data[key],
      save: vi.fn().mockResolvedValue({ ...row(data), get: (key: string) => data[key] })
    }))

    await applyVariantSync({ id: 7 }, 1, [{ id: 3, options: { Color: 'Red' }, attributeValues: [11] }], [], null, tx, 3)

    expect(old.destroy).not.toHaveBeenCalled()
    expect(old.update).toHaveBeenCalled()
    expect(old.$set).toHaveBeenCalledWith('attributeValues', [11], { transaction: tx })
    expect(old.get('skuCode')).toBe('BASE-SKU')
    expect(old.get('code')).toBe('123456789013')
  })

  it('fails instead of silently creating a type-1 product without attribute links', async () => {
    await expect(
      createVariants([{ options: { Color: 'Red' } }], {
        productId: 7,
        vendorId: 1,
        warehouseId: 2,
        baseSku: 'BASE-SKU',
        baseCode: null,
        skuTemplate: undefined,
        transaction: tx
      })
    ).rejects.toThrow('attribute values are not ready')
  })

  it('uses the same SKU and barcode base when adding a variant to an existing variant product', async () => {
    const source = row({ id: 4, productId: 7, code: '123456789013', skuCode: 'BASE-SKU' })
    const attribute = { id: 5, name: 'Color', vendorId: 1 }
    const value = { id: 11, value: 'Red', attributeId: 5, attribute }
    db.productVariant.findAll.mockResolvedValueOnce([source]).mockResolvedValueOnce([])
    db.productAttribute.findAll.mockResolvedValue([attribute])
    db.productAttributeValue.findAll.mockResolvedValue([value])
    db.productVariant.findByPk.mockResolvedValue(null)
    db.productVariant.build.mockImplementation((data: any) => ({
      ...row(data),
      save: vi.fn().mockResolvedValue({ ...row(data), get: (key: string) => data[key] })
    }))

    await applyVariantSync({ id: 7 }, 1, [{ attributeValues: [11] }], [], null, tx)

    expect(db.productVariant.build).toHaveBeenCalledWith(
      expect.objectContaining({
        skuCode: 'BASE-SKU-RED',
        code: '123456789014'
      })
    )
  })

  it('allows updating a variant without changing its existing barcode', async () => {
    const existing = row({ id: 4, productId: 7, code: '123456789013', skuCode: 'BASE-RED' })
    const attribute = { id: 5, name: 'Color', vendorId: 1 }
    const value = { id: 11, value: 'Red', attributeId: 5, attribute }
    db.productVariant.findAll.mockResolvedValueOnce([existing]).mockResolvedValueOnce([])
    db.productVariant.findByPk.mockResolvedValue(existing)
    db.productAttribute.findAll.mockResolvedValue([attribute])
    db.productAttributeValue.findAll.mockResolvedValue([value])

    await expect(
      applyVariantSync(
        { id: 7 },
        1,
        [{ id: 4, attributeValues: [11], code: '123456789013', skuCode: 'BASE-RED' }],
        [],
        null,
        tx
      )
    ).resolves.toBeUndefined()
    expect(existing.update).toHaveBeenCalled()
  })

  it('blocks conversion when the product has an order still being processed', async () => {
    db.orderDetail.findOne.mockResolvedValue({ id: 90 })

    await expect(assertNoProcessingOrders(7, tx)).rejects.toThrow('while an order for this product is being processed')
    expect(db.orderDetail.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: 7 },
        include: [expect.objectContaining({ where: { status: 'draft' } })],
        transaction: tx
      })
    )
  })

  it('blocks conversion when an order has no completed invoice yet', async () => {
    db.orderDetail.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 91, invoiceDetails: [] })

    await expect(assertNoProcessingOrders(7, tx)).rejects.toThrow('until the order has a completed invoice')
    expect(db.orderDetail.findOne).toHaveBeenCalledTimes(2)
  })
})
