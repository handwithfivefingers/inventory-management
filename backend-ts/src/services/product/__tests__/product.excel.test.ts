import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as XLSX from 'xlsx'

/**
 * Unit tests for ProductService Excel features:
 *  - exportExcel: vendor scoping, search filter, workbook shape
 *  - importExcel: create + update by skuCode, per-row report, aliases
 *  - importTemplateExcel: headers + example row
 */

const db = vi.hoisted(() => {
  const MODEL_METHODS = ['findOne', 'findAll', 'findByPk', 'create', 'build', 'count', 'update', 'destroy']
  const mk = () => {
    const m: any = {}
    for (const k of MODEL_METHODS) m[k] = vi.fn()
    return m
  }
  return {
    sequelize: {
      transaction: vi.fn(),
      literal: vi.fn((v: any) => v),
      col: vi.fn((v: any) => v),
      fn: vi.fn((f: string, v: any) => ({ f, v })),
      query: vi.fn()
    },
    product: mk(),
    inventory: mk(),
    category: mk(),
    unit: mk(),
    units: mk(),
    transfer: mk(),
    warehouse: mk(),
    setting: mk(),
    productVariant: mk(),
    productAttribute: mk(),
    productAttributeValue: mk()
  }
})

vi.mock('#/database', () => ({ default: db }))
// The service touches models through the `database.*` seam; direct imports
// below are only `model:` metadata, kept on the same mocks for consistency.
vi.mock('#/database/models/product', () => ({ default: db.product, Product: db.product }))
vi.mock('#/database/models/productVariant', () => ({ default: db.productVariant, ProductVariant: db.productVariant }))
vi.mock('#/database/models/inventory', () => ({ default: db.inventory, Inventory: db.inventory }))
vi.mock('#/database/models/transfer', () => ({ default: db.transfer, Transfer: db.transfer }))
vi.mock('#/database/models/category', () => ({ default: db.category, Category: db.category }))
vi.mock('#/database/models/units', () => ({ default: db.units, Unit: db.units }))
vi.mock('#/database/models/setting', () => ({ default: db.setting, Setting: db.setting }))
// Bypass Redis: run cache loaders inline so results stay deterministic.
vi.mock('#/utils/entity-cache', () => ({
  getCachedEntity: vi.fn((_model: string, _id: unknown, loader: () => Promise<unknown>) => loader()),
  setCachedEntity: vi.fn(),
  evictCachedEntity: vi.fn()
}))

import database from '#/database'
import { ProductService } from '#/services/product'

const productModel = database.product
const productVariantModel = database.productVariant
const inventoryModel = database.inventory
const categoryModel = database.category
const unitModel = database.unit

const tx = { commit: vi.fn(), rollback: vi.fn() }
const makeRow = (fields: Record<string, any>) => {
  const row: any = {
    ...fields,
    get: (key: string) => fields[key],
    update: vi.fn(async (patch: any) => Object.assign(fields, patch)),
    $set: vi.fn(async () => {})
  }
  row.save = vi.fn(async () => row)
  return row
}

const req = (extra: any = {}) =>
  ({
    body: extra.body ?? {},
    params: {},
    // Tenant vendor filter is header-resolved (getRequestedVendorId reads
    // `x-vendor` only); query vendorId is a legacy no-op for exportExcel.
    headers: { 'x-vendor': 3, ...(extra.headers ?? {}) },
    query: { vendorId: 3, ...(extra.query ?? {}) },
    file: extra.file,
    user: { vendorIds: [3] }
  }) as any

beforeEach(() => {
  vi.clearAllMocks()
  db.sequelize.transaction.mockResolvedValue(tx)
  db.sequelize.query.mockResolvedValue([[{ seq: 1 }]])
  db.warehouse.findByPk.mockResolvedValue({ vendorId: 3 })
  db.transfer.build.mockReturnValue({ save: vi.fn(async () => ({})) })
  productModel.findAll.mockResolvedValue([])
  productVariantModel.findAll.mockResolvedValue([])
  productVariantModel.create.mockImplementation(async (fields: any) => makeRow({ id: 77, ...fields }))
  productModel.count.mockResolvedValue(0)
  inventoryModel.findOne.mockResolvedValue(null)
  inventoryModel.build.mockReturnValue({ save: vi.fn(async () => ({})) })
  categoryModel.findAll.mockResolvedValue([])
  unitModel.findOne.mockResolvedValue(null)
})

const makeProduct = (fields: Record<string, any>) =>
  makeRow({
    name: 'P', code: '', skuCode: '', salePrice: 0, regularPrice: 0, wholeSalePrice: 0,
    costPrice: 0, quantity: 0, sold: 0, isNegative: false, categories: [], unit: null,
    description: '', ...fields
  })

const makeVariant = (fields: Record<string, any>) =>
  makeRow({
    id: 7,
    productId: 42,
    code: '',
    skuCode: '',
    salePrice: 0,
    regularPrice: 0,
    wholeSalePrice: 0,
    costPrice: 0,
    VAT: 0,
    sold: 0,
    isNegative: false,
    ...fields
  })

function workbookBuffer(rows: Record<string, any>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows, { header: ['Tên sản phẩm', 'SKU', 'Tồn kho'] })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Products')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

const fileReq = (rows: Record<string, any>[], vendorId: any = 3) =>
  req({ body: { warehouseId: 5, vendorId }, query: { warehouseId: 5, vendorId }, file: { buffer: workbookBuffer(rows) } })

describe('ProductService.exportExcel', () => {
  it('maps products to flat rows and returns an xlsx buffer + filename', async () => {
    productModel.findAll.mockResolvedValue([
      makeProduct({
        name: 'Áo thun',
        quantity: 12,
        variants: [makeVariant({ code: 'A01', skuCode: 'A01-BLUE', salePrice: 150000 })]
      })
    ])

    const { buffer, filename } = await new ProductService().exportExcel(req({}))

    expect(filename).toMatch(/^products-\d{4}-\d{2}-\d{2}\.xlsx$/)
    expect(buffer.length).toBeGreaterThan(0)
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
    expect(rows[0]).toMatchObject({ name: 'Áo thun', code: 'A01', skuCode: 'A01-BLUE', salePrice: 150000, quantity: 12 })
  })

  it('scopes to the vendor and applies the search filter', async () => {
    productModel.findAll.mockResolvedValue([])
    await new ProductService().exportExcel(req({ query: { s: 'ao' } }))

    const arg = productModel.findAll.mock.calls[0][0]
    expect(arg.where.vendorId).toBe(3)
    const nameCol = arg.where.name
    const startsWithKey = Object.getOwnPropertySymbols(nameCol).find((s) => String(s).includes('startsWith'))
    expect(startsWithKey).toBeDefined()
    expect(nameCol[startsWithKey!]).toBe('ao')
  })

  it('rejects foreign vendor scopes (403)', async () => {
    await expect(new ProductService().exportExcel(req({ headers: { 'x-vendor': 9 } }))).rejects.toThrow(
      /Unauthorized vendor filter/
    )
  })
})

describe('ProductService.importExcel', () => {
  it('creates new products with inventory + opening transfer', async () => {
    const created = makeRow({ id: 51, skuCode: 'SKU-NEW' })
    productModel.build.mockReturnValue(created)

    const report = await new ProductService().importExcel(
      fileReq([{ 'Tên sản phẩm': 'Sản phẩm mới', SKU: 'SKU-NEW', 'Tồn kho': 6 }])
    )

    expect(report.created).toBe(1)
    expect(report.failed).toBe(0)
    expect(productModel.build).toHaveBeenCalledWith(expect.objectContaining({ name: 'Sản phẩm mới', vendorId: 3, type: 0 }))
    expect(productVariantModel.create).toHaveBeenCalledWith(expect.objectContaining({ productId: 51, skuCode: 'SKU-NEW' }), expect.anything())
    expect(inventoryModel.build).toHaveBeenCalledWith(expect.objectContaining({ warehouseId: 5, quantity: 6, productId: 51, variantId: 77 }))
    // opening stock booked as IN transfer (type '0')
    expect(db.transfer.build).toHaveBeenCalledWith(expect.objectContaining({ productId: 51, quantity: 6, type: '0' }))
  })

  it('updates existing products matched by skuCode and adjusts stock to the absolute quantity', async () => {
    const product = makeRow({ id: 42, name: 'Cũ' })
    const existing = makeVariant({ id: 77, productId: 42, skuCode: 'SKU-OLD', salePrice: 1, product })
    productVariantModel.findAll.mockResolvedValue([existing])
    inventoryModel.findOne.mockResolvedValue(makeRow({ quantity: 10 }))

    const report = await new ProductService().importExcel(
      fileReq([{ 'Tên sản phẩm': 'Mới', SKU: 'SKU-OLD', 'Tồn kho': 4, 'Giá bán (salePrice)': 99000 }])
    )

    expect(report.updated).toBe(1)
    expect(report.created).toBe(0)
    expect(product.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Mới' }), expect.anything())
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({ salePrice: 99000 }), expect.anything())
    // absolute quantity semantics: inventory set to 4, movement records the -6 delta
    expect(inventoryModel.findOne.mock.calls[0][0].where).toMatchObject({ productId: 42, variantId: 77, warehouseId: 5 })
    expect(db.transfer.build).toHaveBeenCalledWith(expect.objectContaining({ productId: 42, variantId: 77, quantity: 6, type: '1' }))
  })

  it('reports per-row failures without aborting the run', async () => {
    productModel.build.mockImplementation(() => {
      throw new Error('db down')
    })
    const report = await new ProductService().importExcel(
      fileReq([
        { 'Tên sản phẩm': 'Bad', SKU: 'B1' },
        { 'Tên sản phẩm': 'Worse', SKU: 'B2' }
      ])
    )
    expect(report.failed).toBe(2)
    expect(report.errors).toHaveLength(2)
    expect(report.errors[0]).toMatchObject({ row: 2 })
  })

  it('requires a file and a warehouseId', async () => {
    await expect(new ProductService().importExcel(req({ body: { warehouseId: 5 } }))).rejects.toThrow(/File is required/)
    await expect(
      new ProductService().importExcel(req({ body: {}, file: { buffer: workbookBuffer([{ a: 1 }]) } }))
    ).rejects.toThrow(/warehouseId is required/)
  })

  it('rejects an empty workbook', async () => {
    await expect(new ProductService().importExcel(fileReq([]))).rejects.toThrow(/File is empty/)
  })

  it('rejects rows missing a name', async () => {
    const report = await new ProductService().importExcel(fileReq([{ SKU: 'ONLY-SKU', 'Tồn kho': 1 }]))
    expect(report.failed).toBe(1)
    expect(report.errors[0].message).toMatch(/Thiếu tên sản phẩm/)
  })
})

describe('ProductService.importTemplateExcel', () => {
  it('produces a workbook with the canonical headers and one example row', async () => {
    const buffer = await new ProductService().importTemplateExcel()
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ name: 'Ví dụ: Áo thun nam' })
    expect(Object.keys(rows[0])).toEqual(expect.arrayContaining(['name', 'skuCode', 'salePrice', 'quantity', 'isNegative']))
  })
})

export {}
