import database from '#/database'
import Category from '#/database/models/category'
import Product from '#/database/models/product'
import ProductVariant from '#/database/models/productVariant'
import Unit from '#/database/models/units'
import { IRequestLocal } from '#/types/common'
import { assertValidBarcode } from '#/utils/barcode'
import { generateSkuFromTemplate, padSeq } from '#/utils/code-generator'
import { nextSequence } from '#/utils/sequence'
import { assertUniqueVariantSku, assertValidSku, duplicateSkuMessage, normalizeSku } from '#/utils/sku'
import {
  assertVendorAccess,
  assertWarehouseAccess,
  getRequestedVendorId,
  getRequestedWarehouseId,
  getVendorScope
} from '#/utils/tenant'
import { Op, Transaction } from 'sequelize'
import * as XLSX from 'xlsx'
import { SettingService } from '../setting'
import { adjustStock, createOpeningStock } from './product-stock'

/** Column layout shared by the export, the import and the template file. */
const EXCEL_COLUMNS: { header: string; key: string; width?: number }[] = [
  { header: 'Tên sản phẩm', key: 'name', width: 32 },
  { header: 'Mã SP (code)', key: 'code', width: 16 },
  { header: 'SKU', key: 'skuCode', width: 18 },
  { header: 'Giá bán (salePrice)', key: 'salePrice', width: 18 },
  { header: 'Giá niêm yết (regularPrice)', key: 'regularPrice', width: 22 },
  { header: 'Giá sỉ (wholeSalePrice)', key: 'wholeSalePrice', width: 20 },
  { header: 'Giá vốn (costPrice)', key: 'costPrice', width: 16 },
  { header: 'VAT (%)', key: 'VAT', width: 12 },
  { header: 'Tồn kho', key: 'quantity', width: 12 },
  { header: 'Đã bán', key: 'sold', width: 10 },
  { header: 'Cho âm (isNegative)', key: 'isNegative', width: 16 },
  { header: 'Danh mục', key: 'categories', width: 20 },
  { header: 'Đơn vị', key: 'unit', width: 12 },
  { header: 'Mô tả', key: 'description', width: 32 }
]

/** Friendly header/alias -> canonical column key (accepts Vietnamese or English headers). */
const buildAliasMap = (): Record<string, string> => {
  const aliases: Record<string, string> = {
    'ten san pham': 'name',
    'mã sản phẩm': 'code',
    'ma san pham': 'code',
    'gia ban': 'salePrice',
    'giá bán': 'salePrice',
    'ton kho': 'quantity',
    'tồn kho': 'quantity'
  }
  for (const col of EXCEL_COLUMNS) {
    aliases[col.header.toLowerCase().trim()] = col.key
    aliases[col.key.toLowerCase().trim()] = col.key
  }
  return aliases
}

const toNumberOrNull = (v: any): number | null => {
  if (v === '' || v == null) return null
  const n = Number(String(v).replace(/[,\.\sđ]/g, ''))
  return Number.isFinite(n) ? n : null
}

const buildWorkbookBuffer = (rows: Record<string, unknown>[]): Buffer => {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: EXCEL_COLUMNS.map((c) => c.key) })
  worksheet['!cols'] = EXCEL_COLUMNS.map((c) => ({ wch: c.width ?? 14 }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export interface ImportReport {
  created: number
  updated: number
  failed: number
  errors: { row: number; message: string }[]
}

/**
 * Excel export/import for products. Kept separate from `ProductService` so
 * the core CRUD service doesn't carry XLSX parsing / report-formatting
 * concerns.
 */
export class ProductExcelService {
  static readonly EXCEL_COLUMNS = EXCEL_COLUMNS

  /** Build the products .xlsx workbook for the vendor (honours `s` search). */
  async exportExcel(req: IRequestLocal): Promise<{ buffer: Buffer; filename: string }> {
    const scope = getVendorScope(req)
    const rawVendorId = getRequestedVendorId(req)
    const { s } = req.query as any

    const where: any = (() => {
      if (rawVendorId != null && String(rawVendorId).trim() !== '') {
        assertVendorAccess(scope, Number(rawVendorId), 'Unauthorized vendor filter')
        return { vendorId: Number(rawVendorId) }
      }
      return scope === null ? {} : { vendorId: { [Op.in]: scope } }
    })()

    if (s) {
      where.name = { [Op.startsWith]: s }
    }

    const products: any[] = await Product.findAll({
      where,
      attributes: {
        include: [
          [
            database.sequelize.literal(`(
              SELECT COALESCE(SUM(quantity), 0)
              FROM inventories
              WHERE inventories.productId = product.id
            )`),
            'quantity'
          ]
        ]
      },
      include: [
        { model: Category, through: { attributes: [] } },
        { model: Unit, attributes: ['name'] },
        { model: ProductVariant, as: 'variants', limit: 1, order: [['id', 'ASC']] }
      ],
      order: [['id', 'DESC']],
      limit: 5000
    })

    const rows = products.map((p) => {
      const variant = (p.get('variants') || [])[0]
      return {
        name: p.get('name'),
        code: variant?.get('code') ?? '',
        skuCode: variant?.get('skuCode') ?? '',
        salePrice: Number(variant?.get('salePrice') ?? 0),
        regularPrice: Number(variant?.get('regularPrice') ?? 0),
        wholeSalePrice: Number(variant?.get('wholeSalePrice') ?? 0),
        costPrice: Number(variant?.get('costPrice') ?? 0),
        VAT: Number(variant?.get('VAT') ?? 0),
        quantity: Number(p.get('quantity') ?? 0),
        sold: Number(variant?.get('sold') ?? 0),
        isNegative: variant?.get('isNegative') ? 'true' : 'false',
        categories: (p.get('categories') || []).map((c: any) => c.get('name')).join(', '),
        unit: p.get('unit')?.get('name') ?? '',
        description: p.get('description') ?? ''
      }
    })

    return { buffer: buildWorkbookBuffer(rows), filename: `products-${new Date().toISOString().slice(0, 10)}.xlsx` }
  }

  /** Build the import template workbook (headers only + one example row). */
  async importTemplateExcel(): Promise<Buffer> {
    return buildWorkbookBuffer([
      {
        name: 'Ví dụ: Áo thun nam',
        code: '',
        skuCode: '',
        salePrice: 150000,
        regularPrice: 199000,
        wholeSalePrice: 130000,
        costPrice: 90000,
        VAT: 8,
        quantity: 50,
        sold: 0,
        isNegative: 'false',
        categories: '',
        unit: '',
        description: 'Dòng có skuCode trùng sẽ được CẬP NHẬT, dòng mới sẽ được TẠO'
      }
    ])
  }

  /**
   * Import products from an uploaded Excel/CSV file. Rows with an existing
   * skuCode (within the vendor) update prices/stock/description; new rows
   * create products. Quantity creates/adjusts inventory in `warehouseId`.
   * Returns a per-row report.
   */
  async importExcel(req: IRequestLocal): Promise<ImportReport> {
    const scope = getVendorScope(req)
    const body: any = (req as any).body || {}

    const vendorId = this.resolveImportVendorId(req, body, scope)
    if (!vendorId) throw new Error('vendorId is required')

    const warehouseId = Number(body?.warehouseId ?? getRequestedWarehouseId(req))
    if (!warehouseId) throw new Error('warehouseId is required for import (stock adjustments)')
    await assertWarehouseAccess(warehouseId, getVendorScope(req))

    const file: any = (req as any).file
    if (!file?.buffer) throw new Error('File is required')
    const rows = this.readSheetRows(file.buffer)
    if (!rows.length) throw new Error('File is empty')

    const aliasMap = buildAliasMap()
    const bySku = await this.indexExistingProducts(vendorId)
    const settings: any = await new SettingService().getForVendor(vendorId).catch(() => null)

    const report: ImportReport = { created: 0, updated: 0, failed: 0, errors: [] }
    let rowNumber = 1 // data-row number (2 = first sheet row below the header)

    for (const rawRow of rows) {
      rowNumber += 1
      const row = this.normalizeRow(rawRow, aliasMap)
      const name = String(row.name ?? '').trim()
      // Normalize early so update-matching is case-insensitive on the canonical form.
      // Format validation happens inside `importRow` (per-row try/catch) so one
      // bad SKU is reported for its row instead of aborting the whole run.
      const skuCode = normalizeSku(row.skuCode ?? '')
      if (!name && !skuCode) continue // blank row

      try {
        const outcome = await this.importRow({ row, name, skuCode, vendorId, warehouseId, settings, bySku })
        report[outcome] += 1
      } catch (rowError: any) {
        report.failed += 1
        report.errors.push({ row: rowNumber, message: String(rowError?.message ?? rowError) })
      }
    }
    return report
  }

  private resolveImportVendorId(req: IRequestLocal, body: any, scope: number[] | null): number {
    const rawVendorId = body?.vendorId ?? getRequestedVendorId(req)
    if (rawVendorId != null && String(rawVendorId).trim() !== '') {
      const vendorId = Number(rawVendorId)
      assertVendorAccess(scope, vendorId, 'Unauthorized vendor filter')
      return vendorId
    }
    if (scope && scope.length > 0) return scope[0]
    return Number((req as any)?.user?.vendorId)
  }

  private readSheetRows(buffer: Buffer): any[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })
  }

  private normalizeRow(raw: Record<string, any>, aliasMap: Record<string, string>): Record<string, any> {
    const out: Record<string, any> = {}
    for (const [header, value] of Object.entries(raw)) {
      const key = aliasMap[String(header).toLowerCase().trim()]
      if (key) out[key] = value
    }
    return out
  }

  private async indexExistingProducts(vendorId: number) {
    const existing = await ProductVariant.findAll({
      include: [{ model: Product, where: { vendorId }, attributes: ['id', 'name', 'vendorId'] }]
    })
    const bySku = new Map<string, any>()
    for (const variant of existing as any[]) {
      const sku = String(variant.get('skuCode') ?? '').trim()
      if (sku) bySku.set(sku.toLowerCase(), variant)
    }
    return bySku
  }

  /** Resolve a category id by name (first case-insensitive match, comma-separated cell). */
  private async resolveCategoryId(vendorId: number, categoriesCell: unknown): Promise<number | null> {
    const names = String(categoriesCell ?? '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
    if (!names.length) return null
    const categories: any[] = await (database as any).category.findAll({ where: { vendorId } })
    const found = categories.find((c) => names.some((n) => String(c.get('name')).toLowerCase() === n.toLowerCase()))
    return found ? Number(found.get('id')) : null
  }

  /** Resolve a unit id by exact name match. */
  private async resolveUnitId(vendorId: number, unitCell: unknown): Promise<number | null> {
    const unitName = String(unitCell ?? '').trim()
    if (!unitName) return null
    const unit: any = await (database as any).unit.findOne({ where: { vendorId, name: unitName } })
    return unit ? Number(unit.get('id')) : null
  }

  private buildRowFields(row: Record<string, any>, name: string, skuCode: string): Record<string, unknown> {
    const fields: Record<string, unknown> = { name }
    if (row.code !== undefined && row.code !== null && String(row.code).trim() !== '') {
      fields.code = assertValidBarcode(String(row.code).trim(), 'code')
    }
    // Strict SKU rule: normalize trim+uppercase, then ^[A-Z0-9_-]{3,30}$.
    if (skuCode) fields.skuCode = assertValidSku(skuCode, 'sku')
    for (const key of ['salePrice', 'regularPrice', 'wholeSalePrice', 'costPrice'] as const) {
      const n = toNumberOrNull(row[key])
      if (n != null) fields[key] = n
    }
    if (row.VAT !== undefined && row.VAT !== '' && row.VAT !== null) {
      const vat = Number(String(row.VAT).replace(/[,\s%]/g, ''))
      if (Number.isFinite(vat)) fields.VAT = Math.min(100, Math.max(0, vat))
    }
    if (row.description) fields.description = String(row.description).trim()
    if (row.isNegative !== undefined && row.isNegative !== '') {
      fields.isNegative = String(row.isNegative).toLowerCase() === 'true' || String(row.isNegative) === '1'
    }
    return fields
  }

  /** Import one sheet row: update the matching product by SKU, or create a new one. */
  private async importRow(args: {
    row: Record<string, any>
    name: string
    skuCode: string
    vendorId: number
    warehouseId: number
    settings: any
    bySku: Map<string, any>
  }): Promise<'created' | 'updated'> {
    const { row, name, skuCode, vendorId, warehouseId, settings, bySku } = args
    if (!name) throw new Error('Thiếu tên sản phẩm (name)')

    const match = skuCode ? bySku.get(skuCode.toLowerCase()) : null
    const fields = this.buildRowFields(row, name, skuCode)
    const categoryId = await this.resolveCategoryId(vendorId, row.categories)
    const unitId = await this.resolveUnitId(vendorId, row.unit)
    const quantity = toNumberOrNull(row.quantity)

    const t = await database.sequelize.transaction()
    try {
      let outcome: 'created' | 'updated'
      if (match) {
        await this.updateRowProduct(match, fields, categoryId, unitId, quantity, warehouseId, t)
        outcome = 'updated'
      } else {
        const created = await this.createRowProduct(
          fields,
          vendorId,
          settings,
          categoryId,
          unitId,
          quantity,
          warehouseId,
          bySku,
          t
        )
        bySku.set(String(created.get('skuCode') ?? '').toLowerCase(), created)
        outcome = 'created'
      }
      await t.commit()
      return outcome
    } catch (rowError) {
      await t.rollback()
      throw rowError
    }
  }

  private async updateRowProduct(
    match: any,
    fields: Record<string, unknown>,
    categoryId: number | null,
    unitId: number | null,
    quantity: number | null,
    warehouseId: number,
    t: Transaction
  ) {
    const product = match.get('product') ?? match.product
    if (!product) throw new Error('Product not found for variant')
    const { name, description, code, skuCode, salePrice, regularPrice, wholeSalePrice, costPrice, VAT, isNegative } = fields
    await product.update(
      {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(unitId ? { unitId } : {})
      },
      { transaction: t }
    )
    await match.update(
      {
        ...(code !== undefined ? { code } : {}),
        ...(skuCode !== undefined ? { skuCode } : {}),
        ...(salePrice !== undefined ? { salePrice } : {}),
        ...(regularPrice !== undefined ? { regularPrice } : {}),
        ...(wholeSalePrice !== undefined ? { wholeSalePrice } : {}),
        ...(costPrice !== undefined ? { costPrice } : {}),
        ...(VAT !== undefined ? { VAT } : {}),
        ...(isNegative !== undefined ? { isNegative } : {})
      },
      { transaction: t }
    )
    if (categoryId) await product.$set('categories', [categoryId], { transaction: t })
    // Import quantity is an absolute stock level; 0/blank means "leave
    // unchanged" since a blank cell and an explicit 0 are indistinguishable.
    if (quantity != null && quantity !== 0) {
      await adjustStock({
        productId: Number(product.get('id')),
        variantId: Number(match.get('id')),
        warehouseId,
        target: quantity,
        transaction: t
      })
    }
  }

  private async createRowProduct(
    fields: Record<string, unknown>,
    vendorId: number,
    settings: any,
    categoryId: number | null,
    unitId: number | null,
    quantity: number | null,
    warehouseId: number,
    bySku: Map<string, any>,
    t?: Transaction
  ) {
    if (!fields.code || !fields.skuCode) {
      const seq = await nextSequence('product', new Date().getFullYear(), {
        transaction: t,
        initial: (await Product.count()) + 1
      })
      const seq12 = padSeq(seq, 12)
      if (!fields.code) {
        fields.code = seq12
      }
      if (!fields.skuCode) {
        const baseCode = (fields.code as string) || seq12
        fields.skuCode = settings
          ? generateSkuFromTemplate(
              settings.skuTemplate,
              { CODE: baseCode, SEQ: seq12, YYYY: String(new Date().getFullYear()) },
              baseCode
            )
          : baseCode
      }
    }
    if (fields.skuCode) {
      fields.skuCode = normalizeSku(fields.skuCode)
    }
    if (fields.skuCode && bySku.has(String(fields.skuCode).toLowerCase())) {
      throw new Error(duplicateSkuMessage(String(fields.skuCode)))
    }
    // Guard the global variant namespace as well: a product SKU must not
    // collide with an active variant SKU (spec: globally unique variants).
    if (fields.skuCode) {
      await assertUniqueVariantSku(String(fields.skuCode), { transaction: t as unknown })
    }

    const { name, description, code, skuCode, salePrice, regularPrice, wholeSalePrice, costPrice, VAT, isNegative } = fields
    const created: any = await Product.build({ name, description, unitId, vendorId, type: 0 } as any).save({ transaction: t })
    if (categoryId) await created.$set('categories', [categoryId], { transaction: t })
    const variant: any = await ProductVariant.create(
      {
        productId: created.get('id'),
        code,
        skuCode,
        salePrice,
        regularPrice,
        wholeSalePrice,
        costPrice,
        VAT,
        isNegative: Boolean(isNegative),
        isActive: true
      },
      { transaction: t }
    )
    if (quantity) {
      await createOpeningStock({
        productId: created.get('id'),
        variantId: variant.get('id'),
        warehouseId,
        quantity,
        transaction: t
      })
    }
    return variant
  }
}
