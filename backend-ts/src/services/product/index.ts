import database from '#/database'
import Category from '#/database/models/category'
import Inventory from '#/database/models/inventory'
import Product from '#/database/models/product'
import ProductAttribute from '#/database/models/productAttribute'
import ProductAttributeValue from '#/database/models/productAttributeValue'
import ProductVariant from '#/database/models/productVariant'
import Tag from '#/database/models/tag'
import Unit from '#/database/models/units'
import Warehouse from '#/database/models/warehouse'
import { ApiError } from '#/response'
import { IRequestLocal } from '#/types/common'
import { getPagination } from '#/utils'
import { applyCodeFormat, generateSkuFromTemplate, getCodeFormat, padSeq } from '#/utils/code-generator'
import { nextSequence } from '#/utils/sequence'
import { assertVendorAccess, assertWarehouseAccess, getVendorScope } from '#/utils/tenant'
import { buildVariantSkuWithTemplate } from '#/utils/variant'
import { Op, Sequelize } from 'sequelize'
import { SettingService } from '../setting'
import * as XLSX from 'xlsx'

// const InventoryService = require('../inventory')
// const BaseCRUDService = require('@constant/base')
// const TransferService = require('../transfer')
// const { Op } = require('sequelize')
// const { cacheGet, cacheKey, cacheSet, cacheDel } = require('@src/libs/redis')
// const { productCacheItem, productCacheList, CACHE_KEY } = require('./cache')
// const fs = require('fs')
// const XLSX = require('xlsx')

const PRICE_FIELDS = ['salePrice', 'regularPrice', 'wholeSalePrice', 'costPrice'] as const

/**
 * The client sends prices as strings and "" when a field is cleared.
 * MySQL strict mode rejects "" for BIGINT/INT columns ("Data truncated"),
 * so coerce blanks to NULL and numeric strings to numbers.
 */
const toPrice = (value: unknown, field: string): number | null => {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) throw ApiError.badRequest(`Invalid ${field}: must be a number`)
  return n
}

/** Product type: 0 = simple, 1 = variant, 2 = combo */
export const PRODUCT_TYPE = { SIMPLE: 0, VARIANT: 1, COMBO: 2 } as const

const sanitizeCodeSegment = (value: string) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Resolve a variant barcode (`code`).
 * - Manual value wins (trimmed). Empty string clears to null so blank is allowed.
 * - Missing/undefined on create falls back to `{productCode}-{segments}` when the
 *   parent has a barcode; otherwise stays null (manual entry before General
 *   settings are switched on).
 */
const resolveVariantCode = (
  productCode: string | null | undefined,
  inputCode: unknown,
  segments: string[],
  taken: Set<string>,
  opts: { allowBlankUpdate?: boolean } = {}
): string | null | undefined => {
  const hasKey = inputCode !== undefined
  if (hasKey) {
    const trimmed = String(inputCode ?? '').trim()
    if (trimmed) {
      let candidate = trimmed
      let n = 2
      while (taken.has(candidate)) {
        candidate = `${trimmed}-${n}`
        n += 1
      }
      taken.add(candidate)
      return candidate
    }
    // Explicit empty string: allow blank barcode (return null = cleared).
    return null
  }
  if (opts.allowBlankUpdate) return undefined
  const base = String(productCode ?? '').trim()
  if (!base) return null
  const suffix = segments.map(sanitizeCodeSegment).filter(Boolean).join('-')
  if (!suffix) return `${base}`
  let candidate = `${base}-${suffix}`
  let n = 2
  while (taken.has(candidate)) {
    candidate = `${base}-${suffix}-${n}`
    n += 1
  }
  taken.add(candidate)
  return candidate
}

export class ProductService {
  sequelize: Sequelize = database.sequelize
  async create(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const body: any = (req as any).body || {}
      let { warehouseId, vendorId, variants, categories, tags, quantity, ...productParams } = body
      // vendorId may come from query (client sends ?vendorId=) or body
      if (!vendorId) vendorId = (req.query as any)?.vendorId
      if (!vendorId) {
        const scope = getVendorScope(req)
        if (scope && scope.length > 0) vendorId = scope[0]
        else vendorId = (req as any)?.user?.vendorId
      }
      if (!vendorId) throw new Error('vendorId is required')
      vendorId = Number(vendorId)
      assertVendorAccess(getVendorScope(req), vendorId, 'Unauthorized to create product for this vendor')
      if (!warehouseId) throw new Error('warehouseId is required')
      await assertWarehouseAccess(warehouseId, getVendorScope(req))

      for (const f of PRICE_FIELDS) productParams[f] = toPrice(productParams[f], f)

      const duplicateOr: Record<string, unknown>[] = []
      if (productParams.code) duplicateOr.push({ code: productParams.code })
      if (productParams.skuCode) duplicateOr.push({ skuCode: productParams.skuCode })
      if (duplicateOr.length > 0) {
        const isExist = await Product.findOne({
          where: {
            vendorId,
            [Op.or]: duplicateOr
          }
        })
        if (isExist) {
          throw ApiError.conflict('Product already exists or code/skuCode is duplicated')
        }
      }

      let settings: any = null
      try {
        settings = await new SettingService().getForVendor(vendorId)
      } catch (e) {
        console.warn('settings not available for product code generation', e)
      }

      let seq: number | null = null
      if (settings && (!productParams.code || !productParams.skuCode)) {
        seq = await nextSequence('product', new Date().getFullYear(), {
          transaction: t,
          initial: (await Product.count()) + 1
        })
      }

      if (!productParams.code && settings && seq != null) {
        const { prefix, suffix } = getCodeFormat(settings.codePrefix, settings.codeSuffix, 'product')
        productParams.code = applyCodeFormat(padSeq(seq), prefix, suffix)
      }
      if (!productParams.skuCode && settings && seq != null) {
        const baseCode = productParams.code || padSeq(seq)
        productParams.skuCode = generateSkuFromTemplate(
          settings.skuTemplate,
          {
            CODE: baseCode,
            SEQ: padSeq(seq),
            YYYY: String(new Date().getFullYear())
          },
          baseCode
        )
      }

      const _prod = await Product.build({ ...productParams, vendorId } as any).save({ transaction: t })
      const builtIsVariant = Array.isArray(variants) && variants.length > 0
      await (_prod as any).update(
        { type: (productParams as any).type ?? (builtIsVariant ? PRODUCT_TYPE.VARIANT : PRODUCT_TYPE.SIMPLE) },
        { transaction: t }
      )

      if (categories) {
        await (_prod as any).$set('categories', categories, { transaction: t })
      }
      if (tags) {
        await (_prod as any).$set('tags', tags, { transaction: t })
      }
      // New schema: variants carry attributeIds / attributeValueIds (vendor-global)
      const createdVariants: any[] = []
      if (builtIsVariant) {
        const baseSku = (productParams as any).skuCode || (productParams as any).code || String((_prod as any).id)
        const baseCode = (productParams as any).code || null
        let skuTemplate: string | undefined
        try {
          skuTemplate = (settings as any)?.skuTemplate
        } catch {}
        const takenSkus = new Set<string>([baseSku])
        const takenCodes = new Set<string>([String(baseCode ?? '').trim()].filter(Boolean) as string[])
        for (const v of variants as any[]) {
          const valIds: number[] = Array.isArray(v.attributeValues)
            ? v.attributeValues.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n))
            : []
          // Validate attributeValues belong to vendor via their parent attribute
          if (valIds.length) {
            const vals: any[] = await ProductAttributeValue.findAll({
              where: { id: valIds },
              include: [{ model: ProductAttribute, attributes: ['id', 'vendorId'] }],
              transaction: t
            })
            if (vals.length !== valIds.length) throw new Error('Invalid attributeValues')
            for (const val of vals as any[]) {
              const aVendor = val.attribute?.vendorId ?? val.productAttribute?.vendorId
              if (Number(aVendor) !== Number(vendorId)) throw new Error('Attribute value vendor mismatch')
            }
          }
          // Build SKU if missing - honor template then append value segments
          let skuCode: string = v.skuCode ? String(v.skuCode).trim() : ''
          if (!skuCode) {
            // Derive readable segments from values for SKU suffix
            const vals: any[] = valIds.length
              ? await ProductAttributeValue.findAll({ where: { id: valIds }, transaction: t })
              : []
            const optMap: Record<string, string> = {}
            for (const val of vals as any[]) optMap[String(val.attributeId)] = String(val.value)
            skuCode = buildVariantSkuWithTemplate(skuTemplate, baseSku, optMap as any, takenSkus)
          }
          takenSkus.add(skuCode)
          const valsForCode: any[] = valIds.length
            ? await ProductAttributeValue.findAll({ where: { id: valIds }, transaction: t })
            : []
          const codeSegments = valsForCode.map((val: any) => String(val.value ?? ''))
          const variantCode = resolveVariantCode(baseCode, (v as any).code, codeSegments, takenCodes)
          const variantRow: any = await (database as any).productVariant
            .build({
              productId: (_prod as any).id,
              code: variantCode,
              skuCode,
              salePrice: toPrice(v.salePrice, 'salePrice'),
              regularPrice: toPrice(v.regularPrice, 'regularPrice'),
              wholeSalePrice: toPrice(v.wholeSalePrice, 'wholeSalePrice'),
              costPrice: toPrice(v.costPrice, 'costPrice'),
              isNegative: Boolean(v.isNegative) || false,
              isActive: v.isActive !== undefined ? Boolean(v.isActive) : true
            })
            .save({ transaction: t })
          // if (attrIds.length) await variantRow.$set('attributes', attrIds, { transaction: t })
          if (valIds.length) await variantRow.$set('attributeValues', valIds, { transaction: t })
          const qty = Number(v.quantity ?? 0)
          if (qty !== 0) {
            const inv = await (database as any).inventory
              .build({ warehouseId, quantity: qty, productId: (_prod as any).id, variantId: variantRow.id })
              .save({ transaction: t })
            await (database as any).transfer
              .build({
                fromWarehouseId: warehouseId,
                quantity: qty,
                productId: (_prod as any).id,
                variantId: variantRow.id,
                type: '0'
              })
              .save({ transaction: t })
            createdVariants.push({ ...variantRow.dataValues, inventory: inv.dataValues })
          } else {
            createdVariants.push(variantRow.dataValues)
          }
        }
      } else {
        // Simple product stock
        const qty = Number((quantity as any) ?? (productParams as any).quantity ?? 0)
        if (qty !== 0) {
          const inv = await Inventory.build({ warehouseId, quantity: qty, productId: (_prod as any).id } as any).save({
            transaction: t
          })
          const tr = await (database as any).transfer
            .build({ fromWarehouseId: warehouseId, quantity: qty, productId: (_prod as any).id, type: '0' })
            .save({ transaction: t })
          await t.commit()
          return {
            product: (_prod as any).dataValues,
            inventory: (inv as any).dataValues,
            transfer: (tr as any).dataValues,
            variants: []
          }
        }
      }
      await t.commit()
      return { product: (_prod as any).dataValues, variants: createdVariants }

      // const hasVariants = hasVariantAttributes
      // const createdVariants: any[] = []
      // let _invData: any = null
      // let _transData: any = null
      // if (hasVariants) {
      //   // Attribute-based product: persist the option matrix, then one variant
      //   // row per attribute-value combination (WooCommerce style).
      //   const valueKeyToId = new Map<string, number>()
      //   for (const attr of attributes) {
      //     if (!attr?.name) continue
      //     const attrRow = await ProductAttribute.build({ name: attr.name, productId: _prod.id }).save({
      //       transaction: t
      //     })
      //     for (const value of attr.values || []) {
      //       if (value == null || value === '') continue
      //       const valRow = await ProductAttributeValue.build({
      //         value,
      //         attributeId: attrRow.id,
      //         productId: _prod.id
      //       }).save({ transaction: t })
      //       valueKeyToId.set(`${attr.name}::${value}`, valRow.id)
      //     }
      //   }
      //   const combos = buildAttributeCombinations(attributes)
      //   const manualSelection = generateAll === false
      //   const selectedCombos = manualSelection
      //     ? combos.filter((options) => !!findOverride(variantOverrides, options))
      //     : combos
      //   const baseSku = params.skuCode || params.code || String(_prod.id)
      //   const takenSkus = new Set<string>([baseSku])
      //   for (const options of selectedCombos) {
      //     const override: any = findOverride(variantOverrides, options)
      //     // Variant SKUs follow the vendor SKU template, then get the
      //     // attribute segments appended (e.g. "SP00001-DO", "SP00001-TRANG").
      //     const skuCode =
      //       override?.skuCode || buildVariantSkuWithTemplate(settings?.skuTemplate, baseSku, options, takenSkus)
      //     takenSkus.add(skuCode)
      //     const variantRow = await (database as any).productVariant
      //       .build({
      //         productId: _prod.id,
      //         skuCode,
      //         salePrice: override?.salePrice ?? null,
      //         regularPrice: override?.regularPrice ?? null,
      //         wholeSalePrice: override?.wholeSalePrice ?? null,
      //         costPrice: override?.costPrice ?? null,
      //         isNegative: Boolean(override?.isNegative) || false
      //       })
      //       .save({ transaction: t })
      //     const valueIds = Object.keys(options)
      //       .map((name) => valueKeyToId.get(`${name}::${options[name]}`))
      //       .filter(Boolean)
      //     // await variantRow.setAttributeValues(valueIds as number[], { transaction: t })
      //     await variantRow.$set('attributeValues', valueIds as number[], { transaction: t })
      //     // Opening stock per variant (defaults to 0 when not provided)
      //     const variantQuantity = Number(override?.quantity ?? 0)
      //     let inventoryRow: any = null
      //     if (variantQuantity !== 0) {
      //       inventoryRow = await (database as any).inventory
      //         .build({
      //           warehouseId,
      //           quantity: variantQuantity,
      //           productId: _prod.id,
      //           variantId: variantRow.id
      //         })
      //         .save({ transaction: t })
      //       await (database as any).transfer
      //         .build({
      //           fromWarehouseId: warehouseId,
      //           quantity: variantQuantity,
      //           productId: _prod.id,
      //           variantId: variantRow.id,
      //           type: '0'
      //         })
      //         .save({ transaction: t })
      //     }
      //     createdVariants.push({
      //       ...variantRow.dataValues,
      //       inventory: inventoryRow ? inventoryRow.dataValues : null
      //     })
      //   }
      // } else {
      //   // Simple product: single product-level stock row + opening IN transfer
      //   const _inv = Inventory.build({
      //     warehouseId,
      //     quantity,
      //     productId: _prod.id
      //   })
      //   const _trans = Transfer.build({
      //     fromWarehouseId: warehouseId,
      //     productId: _prod.id,
      //     quantity,
      //     type: '0'
      //   })
      //   await _inv.save({ transaction: t })
      //   await _trans.save({ transaction: t })
      //   _invData = _inv.dataValues
      //   _transData = _trans.dataValues
      // }
      // await t.commit()
      // return {
      //   ...(hasVariants ? {} : { inventory: _invData, transfer: _transData }),
      //   product: _prod.dataValues,
      //   ...(hasVariants ? { variants: createdVariants } : {})
      // }
    } catch (error) {
      await t.rollback()
      // Preserve the original status (403/404 from tenant guards, 409 for
      // duplicates); default to 400 so validation failures never surface as
      // an opaque 500 from the global error handler.
      throw ApiError.from(error, (error as any)?.status ?? 400)
    }
  }

  /* ------------------------------------------------------------------ */
  /* Excel export / import                                               */
  /* ------------------------------------------------------------------ */

  /** Column layout shared by the export, the import and the template file. */
  static readonly EXCEL_COLUMNS: { header: string; key: string; width?: number }[] = [
    { header: 'Tên sản phẩm', key: 'name', width: 32 },
    { header: 'Mã SP (code)', key: 'code', width: 16 },
    { header: 'SKU', key: 'skuCode', width: 18 },
    { header: 'Giá bán (salePrice)', key: 'salePrice', width: 18 },
    { header: 'Giá niêm yết (regularPrice)', key: 'regularPrice', width: 22 },
    { header: 'Giá sỉ (wholeSalePrice)', key: 'wholeSalePrice', width: 20 },
    { header: 'Giá vốn (costPrice)', key: 'costPrice', width: 16 },
    { header: 'Tồn kho', key: 'quantity', width: 12 },
    { header: 'Đã bán', key: 'sold', width: 10 },
    { header: 'Cho âm (isNegative)', key: 'isNegative', width: 16 },
    { header: 'Danh mục', key: 'categories', width: 20 },
    { header: 'Đơn vị', key: 'unit', width: 12 },
    { header: 'Mô tả', key: 'description', width: 32 }
  ]

  /**
   * Build the products .xlsx workbook for the vendor ( honours `s` search )
   * and return it as a Buffer for the controller to stream as a download.
   */
  async exportExcel(req: IRequestLocal): Promise<{ buffer: Buffer; filename: string }> {
    const scope = getVendorScope(req)
    const rawVendorId = (req.query as any)?.vendorId
    const { s } = req.query as any
    const vendorWhereClause = (() => {
      if (rawVendorId != null && String(rawVendorId).trim() !== '') {
        assertVendorAccess(scope, Number(rawVendorId), 'Unauthorized vendor filter')
        return { vendorId: Number(rawVendorId) }
      }
      if (scope === null) return {}
      return { vendorId: { [Op.in]: scope } }
    })()

    const where: any = { ...vendorWhereClause }
    if (s) {
      where[Op.or] = {
        name: { [Op.startsWith]: s },
        code: { [Op.startsWith]: s },
        skuCode: { [Op.startsWith]: s }
      }
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
        { model: Unit, attributes: ['name'] }
      ],
      order: [['id', 'DESC']],
      limit: 5000
    })

    const rows = products.map((p: any) => ({
      name: p.get('name'),
      code: p.get('code') ?? '',
      skuCode: p.get('skuCode') ?? '',
      salePrice: Number(p.get('salePrice') ?? 0),
      regularPrice: Number(p.get('regularPrice') ?? 0),
      wholeSalePrice: Number(p.get('wholeSalePrice') ?? 0),
      costPrice: Number(p.get('costPrice') ?? 0),
      quantity: Number(p.get('quantity') ?? 0),
      sold: Number(p.get('sold') ?? 0),
      isNegative: p.get('isNegative') ? 'true' : 'false',
      categories: (p.get('categories') || []).map((c: any) => c.get('name')).join(', '),
      unit: p.get('unit')?.get('name') ?? '',
      description: p.get('description') ?? ''
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: ProductService.EXCEL_COLUMNS.map((c) => c.key)
    })
    worksheet['!cols'] = ProductService.EXCEL_COLUMNS.map((c) => ({ wch: c.width ?? 14 }))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const filename = `products-${new Date().toISOString().slice(0, 10)}.xlsx`
    return { buffer, filename }
  }

  /**
   * Build the import template workbook (headers only + one example row).
   */
  async importTemplateExcel(): Promise<Buffer> {
    const example = {
      name: 'Ví dụ: Áo thun nam',
      code: '',
      skuCode: '',
      salePrice: 150000,
      regularPrice: 199000,
      wholeSalePrice: 130000,
      costPrice: 90000,
      quantity: 50,
      sold: 0,
      isNegative: 'false',
      categories: '',
      unit: '',
      description: 'Dòng có skuCode trùng sẽ được CẬP NHẬT, dòng mới sẽ được TẠO'
    }
    const worksheet = XLSX.utils.json_to_sheet([example], {
      header: ProductService.EXCEL_COLUMNS.map((c) => c.key)
    })
    worksheet['!cols'] = ProductService.EXCEL_COLUMNS.map((c) => ({ wch: c.width ?? 14 }))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  }

  /**
   * Import products from an uploaded Excel/CSV file. Rows with an existing
   * skuCode (within the vendor) update prices/stock/description; new rows
   * create products. Quantity creates/adjusts inventory in `warehouseId`.
   * Returns a per-row report.
   */
  async importExcel(req: IRequestLocal): Promise<{
    created: number
    updated: number
    failed: number
    errors: { row: number; message: string }[]
  }> {
    const scope = getVendorScope(req)
    const body: any = (req as any).body || {}
    const rawVendorId = body?.vendorId ?? (req.query as any)?.vendorId
    let vendorId: number
    if (rawVendorId != null && String(rawVendorId).trim() !== '') {
      vendorId = Number(rawVendorId)
      assertVendorAccess(scope, vendorId, 'Unauthorized vendor filter')
    } else if (scope && scope.length > 0) {
      vendorId = scope[0]
    } else {
      vendorId = (req as any)?.user?.vendorId
    }
    if (!vendorId) throw new Error('vendorId is required')

    const warehouseId = Number(body?.warehouseId ?? (req.query as any)?.warehouseId)
    if (!warehouseId) throw new Error('warehouseId is required for import (stock adjustments)')
    await assertWarehouseAccess(warehouseId, getVendorScope(req))

    const file: any = (req as any).file
    if (!file?.buffer) throw new Error('File is required')
    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })
    if (!rows.length) throw new Error('File is empty')

    // Column aliases -> canonical keys (accept both Vietnamese headers and keys)
    const aliasMap: Record<string, string> = {}
    for (const col of ProductService.EXCEL_COLUMNS) {
      aliasMap[col.header.toLowerCase().trim()] = col.key
      aliasMap[col.key.toLowerCase().trim()] = col.key
    }
    // Common friendly aliases
    aliasMap['ten san pham'] = 'name'
    aliasMap['mã sản phẩm'] = 'code'
    aliasMap['ma san pham'] = 'code'
    aliasMap['gia ban'] = 'salePrice'
    aliasMap['giá bán'] = 'salePrice'
    aliasMap['ton kho'] = 'quantity'
    aliasMap['tồn kho'] = 'quantity'

    const normalizeRow = (raw: Record<string, any>) => {
      const out: Record<string, any> = {}
      for (const [header, value] of Object.entries(raw)) {
        const key = aliasMap[String(header).toLowerCase().trim()]
        if (key) out[key] = value
      }
      return out
    }

    const toNumber = (v: any): number | null => {
      if (v === '' || v == null) return null
      const n = Number(String(v).replace(/[,\.\sđ]/g, ''))
      return Number.isFinite(n) ? n : null
    }

    // Preload the vendor's existing products keyed by skuCode for update detection
    const existing = await Product.findAll({
      where: { vendorId },
      attributes: ['id', 'name', 'skuCode', 'code']
    })
    const bySku = new Map<string, any>()
    for (const p of existing as any[]) {
      const sku = String(p.get('skuCode') ?? '').trim()
      if (sku) bySku.set(sku.toLowerCase(), p)
    }

    const settings: any = await new SettingService().getForVendor(vendorId).catch(() => null)
    const report = { created: 0, updated: 0, failed: 0, errors: [] as { row: number; message: string }[] }
    // data-row number (2 = first sheet row below the header)
    let rowNumber = 1

    for (const rawRow of rows) {
      rowNumber += 1
      const row = normalizeRow(rawRow)
      const name = String(row.name ?? '').trim()
      const skuCode = String(row.skuCode ?? '').trim()
      if (!name && !skuCode) continue // blank row
      try {
        if (!name) throw new Error('Thiếu tên sản phẩm (name)')

        const match = skuCode ? bySku.get(skuCode.toLowerCase()) : null
        const fields: Record<string, unknown> = { name }
        if (row.code) fields.code = String(row.code).trim()
        if (skuCode) fields.skuCode = skuCode
        for (const key of ['salePrice', 'regularPrice', 'wholeSalePrice', 'costPrice'] as const) {
          const n = toNumber(row[key])
          if (n != null) fields[key] = n
        }
        if (row.description) fields.description = String(row.description).trim()
        if (row.isNegative !== undefined && row.isNegative !== '') {
          fields.isNegative = String(row.isNegative).toLowerCase() === 'true' || String(row.isNegative) === '1'
        }

        // Category by name (first match, case-insensitive)
        let categoryId: number | null = null
        const categoryNames = String(row.categories ?? '')
          .split(',')
          .map((c: string) => c.trim())
          .filter(Boolean)
        if (categoryNames.length) {
          const cats: any[] = await Category.findAll({ where: { vendorId } })
          const found = cats.find((c) =>
            categoryNames.some((n) => String(c.get('name')).toLowerCase() === n.toLowerCase())
          )
          if (found) categoryId = Number(found.get('id'))
        }
        // Unit by name
        let unitId: number | null = null
        const unitName = String(row.unit ?? '').trim()
        if (unitName) {
          const unit: any = await Unit.findOne({ where: { vendorId, name: unitName } })
          if (unit) unitId = Number(unit.get('id'))
        }

        const quantity = toNumber(row.quantity)
        const t = await this.sequelize.transaction()
        try {
          if (match) {
            // ---------- UPDATE ----------
            await match.update(fields, { transaction: t })
            if (categoryId) await (match as any).$set('categories', [categoryId], { transaction: t })
            if (unitId) await match.update({ unitId }, { transaction: t })
            if (quantity != null && quantity !== 0) {
              // Adjust stock to the absolute quantity via corrective transfer
              const inv: any = await Inventory.findOne({
                where: { productId: match.get('id'), warehouseId, variantId: null },
                transaction: t
              })
              const current = Number(inv?.get('quantity') ?? 0)
              const delta = quantity - current
              if (!inv && quantity !== 0) {
                await Inventory.build({ warehouseId, quantity, productId: match.get('id') }).save({ transaction: t })
              } else if (inv) {
                await inv.update({ quantity }, { transaction: t })
              }
              if (delta !== 0) {
                await (database as any).transfer
                  .build({
                    fromWarehouseId: warehouseId,
                    quantity: Math.abs(delta),
                    productId: match.get('id'),
                    type: delta > 0 ? '0' : '1'
                  })
                  .save({ transaction: t })
              }
            }
            report.updated += 1
          } else {
            // ---------- CREATE ----------
            let seq: number | null = null
            if (settings) {
              seq = await nextSequence('product', new Date().getFullYear(), {
                transaction: t,
                initial: (await Product.count()) + 1
              })
            }
            if (!fields.code && settings && seq != null) {
              const { prefix, suffix } = getCodeFormat(settings.codePrefix, settings.codeSuffix, 'product')
              fields.code = applyCodeFormat(padSeq(seq), prefix, suffix)
            }
            if (!fields.skuCode && settings && seq != null) {
              const baseCode = (fields.code as string) || padSeq(seq)
              fields.skuCode = generateSkuFromTemplate(
                settings.skuTemplate,
                {
                  CODE: baseCode,
                  SEQ: padSeq(seq),
                  YYYY: String(new Date().getFullYear())
                },
                baseCode
              )
            }
            if (fields.skuCode && bySku.has(String(fields.skuCode).toLowerCase())) {
              throw new Error(`SKU ${fields.skuCode} đã tồn tại trong hệ thống`)
            }
            const created: any = await Product.build({ ...fields, vendorId } as any).save({ transaction: t })
            if (categoryId) await created.$set('categories', [categoryId], { transaction: t })
            if (unitId) await created.update({ unitId }, { transaction: t })
            if (quantity != null && quantity !== 0) {
              await Inventory.build({ warehouseId, quantity, productId: created.get('id') }).save({ transaction: t })
              await (database as any).transfer
                .build({
                  fromWarehouseId: warehouseId,
                  quantity,
                  productId: created.get('id'),
                  type: '0'
                })
                .save({ transaction: t })
            }
            bySku.set(String(created.get('skuCode') ?? '').toLowerCase(), created)
            report.created += 1
          }
          await t.commit()
        } catch (rowError) {
          await t.rollback()
          throw rowError
        }
      } catch (rowError: any) {
        report.failed += 1
        report.errors.push({ row: rowNumber, message: String(rowError?.message ?? rowError) })
      }
    }
    return report
  }

  async getProducts(req: IRequestLocal) {
    try {
      const { s } = req.query as any
      const rawVendorId = (req.query as any)?.vendorId
      const scope = getVendorScope(req)
      const { offset, limit } = getPagination(req.query)
      let variantMatchedProductIds: number[] = []
      const vendorWhereClause = (() => {
        if (rawVendorId != null && String(rawVendorId).trim() !== '') {
          assertVendorAccess(scope, Number(rawVendorId), 'Unauthorized vendor filter')
          return { vendorId: Number(rawVendorId) }
        }
        if (scope === null) return {}
        return { vendorId: { [Op.in]: scope } }
      })()

      const queryParams: any = {
        where: {
          ...vendorWhereClause
        },
        include: [
          {
            model: ProductVariant,
            as: 'variants',
            required: false,
            include: [
              { model: Inventory, attributes: ['id', 'warehouseId', 'quantity', 'variantId'] },
              {
                model: ProductAttributeValue,
                as: 'attributeValues',
                attributes: ['id', 'value', 'attributeId'],
                through: { attributes: [] },
                include: [{ model: database.productAttribute, attributes: ['id', 'name'] }]
              }
            ]
          }
        ],
        attributes: {
          include: [
            [
              database.sequelize.literal(`(
                SELECT COUNT(*)
                FROM productVariants AS variants
                WHERE variants.productId = product.id
              )`),
              'variantCount'
            ],
            [
              database.sequelize.literal(`(
                SELECT SUM(quantity)
                FROM inventories
                WHERE inventories.productId = product.id
              )`),
              'quantity'
            ]
          ]
        },
        offset,
        limit,
        order: [['id', 'DESC']],
        distinct: true
      }
      if (s) {
        const matchedVariants = await ProductVariant.findAll({
          where: {
            [Op.or]: [{ code: { [Op.startsWith]: s } }, { skuCode: { [Op.startsWith]: s } }]
          },
          attributes: ['productId'],
          raw: true
        })
        variantMatchedProductIds = [
          ...new Set(matchedVariants.map((variant: any) => Number(variant.productId)).filter(Boolean))
        ]
        queryParams.where = {
          // @ts-ignore
          [Op.or]: [
            { name: { [Op.startsWith]: s } },
            { code: { [Op.startsWith]: s } },
            { skuCode: { [Op.startsWith]: s } },
            ...(variantMatchedProductIds.length ? [{ id: { [Op.in]: variantMatchedProductIds } }] : [])
          ],
          ...queryParams.where
        }
      }

      const { rows, count } = await Product.findAndCountAll(queryParams)
      // const [rows] = await this.sequelize.query(
      //   `
      //   select * from (
      //   select id from products
      //   where vendorId = :vendorId
      //   limit :offset,:limit
      //   ) as t
      //   INNER JOIN products p ON t.id = p.id
      //   LEFT JOIN inventories i ON p.id = i.productId
      //   `,
      //   {
      //     replacements: {
      //       vendorId: vendorWhereClause.vendorId,
      //       offset,
      //       limit
      //     }
      //   }
      // )
      // const [count] = await this.sequelize.query(
      //   `
      //   select count(*) from products
      //   where vendorId = ${vendorWhereClause.vendorId}
      //   `
      //   // {
      //   //   replacements: {
      //   //     vendorId: vendorWhereClause.vendorId
      //   //   }
      //   // }
      // )

      // Aggregate stock + variant counts for this page in two grouped queries.
      // const ids = rows.map((row: any) => Number(typeof row.get === 'function' ? row.get('id') : row.id))
      // const attach = (row: any, key: string, value: number) => {
      //   if (typeof row?.setDataValue === 'function') row.setDataValue(key, value)
      //   else row[key] = value
      //   return row
      // }
      // let quantityByProduct = new Map<number, number>()
      // let variantCountByProduct = new Map<number, number>()
      // if (ids.length > 0) {
      //   const stockRows = (await Inventory.findAll({
      //     where: { productId: { [Op.in]: ids } },
      //     attributes: ['productId', [this.sequelize.fn('SUM', this.sequelize.col('quantity')), 'total']],
      //     group: ['productId'],
      //     raw: true
      //   })) as any[]
      //   quantityByProduct = new Map(stockRows.map((r: any) => [Number(r.productId), Number(r.total) || 0]))

      //   const variantRows = (await ProductVariant.findAll({
      //     where: { productId: { [Op.in]: ids } },
      //     attributes: ['productId', [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'variantCount']],
      //     group: ['productId'],
      //     raw: true
      //   })) as any[]
      //   variantCountByProduct = new Map(variantRows.map((r: any) => [Number(r.productId), Number(r.variantCount) || 0]))
      // }

      // const enriched = rows.map((row: any) => {
      //   attach(
      //     row,
      //     'quantity',
      //     quantityByProduct.get(Number(typeof row.get === 'function' ? row.get('id') : row.id)) ?? 0
      //   )
      //   attach(
      //     row,
      //     'variantCount',
      //     variantCountByProduct.get(Number(typeof row.get === 'function' ? row.get('id') : row.id)) ?? 0
      //   )
      //   return row
      // })

      return { rows: rows, count }
    } catch (error) {
      console.log('error', error)
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  async getProductById(req: IRequestLocal) {
    try {
      const params = req.params as any
      const scope = getVendorScope(req)
      const rawVendorId = (req.query as any)?.vendorId ?? (req.query as any)?.vendor
      if (rawVendorId != null && String(rawVendorId).trim() !== '') {
        assertVendorAccess(scope, Number(rawVendorId), 'Unauthorized vendor filter')
      }
      const product: any = await (database as any).product.findOne({
        where: {
          id: params.id
        },
        include: [
          { model: Inventory, attributes: [] },
          {
            model: Category,
            attributes: ['id', 'name'],
            through: {
              attributes: []
            }
          },
          {
            model: Tag,
            attributes: ['id', 'name'],
            through: {
              attributes: []
            }
          },
          {
            model: Unit,
            attributes: ['id', 'name']
          },
          {
            model: ProductVariant,
            as: 'variants',
            include: [
              {
                model: ProductAttributeValue,
                as: 'attributeValues',
                attributes: ['id', 'value', 'attributeId'],
                through: { attributes: [] },
                include: [{ model: database.productAttribute, attributes: ['id', 'name'] }]
              }
            ]
          }
        ],
        attributes: {
          include: [
            [database.sequelize.col('inventories.quantity'), 'quantity'],
            [database.sequelize.col('unit.id'), 'unitId'],
            [database.sequelize.col('unit.name'), 'unitName']
          ]
        }
      })
      if (!product) return product
      const productVendorId = Number((product as any).vendorId ?? (product.get ? product.get('vendorId') : undefined))
      assertVendorAccess(scope, productVendorId, 'Unauthorized to view this product')
      if (rawVendorId != null && String(rawVendorId).trim() !== '' && productVendorId !== Number(rawVendorId)) {
        const err = new Error('Unauthorized to view this product') as Error & { status?: number }
        err.status = 403
        throw err
      }
      return product
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /**
   * List variants of a product with their attribute combination and,
   * optionally, per-warehouse stock. GET /products/:id/variants?warehouseId=1
   */
  async getProductVariants(req: IRequestLocal) {
    try {
      const productId = Number((req.params as any).id)
      const warehouseId = (req.query as any)?.warehouseId ? Number((req.query as any).warehouseId) : null
      if (!productId) throw new Error('product id is required')
      const scope = getVendorScope(req)
      const product: any = await (database as any).product.findByPk(productId)
      if (!product) throw new Error(`Product ${productId} not found`)
      assertVendorAccess(
        scope,
        Number(product.vendorId ?? product.get?.('vendorId')),
        'Unauthorized to view this product'
      )

      const inventoryInclude: any = {
        model: database.inventory,
        attributes: ['id', 'warehouseId', 'quantity', 'variantId']
      }
      if (warehouseId) inventoryInclude.where = { warehouseId }

      return await (database as any).productVariant.findAndCountAll({
        where: { productId },
        include: [
          {
            model: database.productAttributeValue,
            as: 'attributeValues',
            attributes: ['id', 'value'],
            through: { attributes: [] },
            include: [
              {
                model: database.productAttribute,
                attributes: ['id', 'name']
              }
            ]
          },
          inventoryInclude
        ] as any,
        order: [['id', 'ASC']]
      })
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /**
   * Unified update for simple / variant / combo products.
   * PUT /products/:id
   * body: { name?, code?, skuCode?, description?, unitId?, unit?, categories?,
   *   tags?, salePrice?, regularPrice?, wholeSalePrice?, costPrice?,
   *   isNegative?, image?, type?, quantity?, warehouseId?, variants?,
   *   removedVariantIds? }
   * - `type`: 0 simple, 1 variant, 2 combo. Falls back to the stored type,
   *   then to variant-row existence for legacy rows.
   * - Simple (0): updates base fields + product-level stock (`quantity`
   *   requires `warehouseId`).
   * - Variant (1): updates base fields (prices/quantity on the parent are
   *   ignored) and syncs `variants`/`removedVariantIds` in the same txn.
   * - Combo (2): base fields only for now; variant payload is ignored.
   */
  async updateProduct(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const productId = Number((req.params as any).id)
      if (!productId) throw new Error('product id is required')
      const body: any = (req as any).body || {}
      const query: any = (req as any).query || {}
      const scope = getVendorScope(req)
      const product: any = await (database as any).product.findByPk(productId, { transaction: t })
      if (!product) throw new Error(`Product ${productId} not found`)
      const vendorId = Number(product.vendorId ?? product.get?.('vendorId'))
      assertVendorAccess(scope, vendorId, 'Unauthorized to update this product')

      const existingVariantCount = await (database as any).productVariant.count({
        where: { productId },
        transaction: t
      })
      const storedType = Number(product.type ?? product.get?.('type') ?? (existingVariantCount > 0 ? 1 : 0))
      const nextType =
        body.type !== undefined && body.type !== null && String(body.type) !== ''
          ? Number(body.type)
          : storedType
      if (![0, 1, 2].includes(nextType)) throw new Error('Invalid type: must be 0 (simple), 1 (variant) or 2 (combo)')

      const warehouseIdRaw = body.warehouseId ?? query.warehouseId
      const warehouseId = warehouseIdRaw !== undefined && warehouseIdRaw !== null && String(warehouseIdRaw) !== ''
        ? Number(warehouseIdRaw)
        : null
      if (warehouseId) await assertWarehouseAccess(warehouseId, scope)

      // Base fields whitelist (unit accepts `unit` alias from the client form)
      const base: Record<string, unknown> = {}
      const copyString = (key: string, allowEmptyToNull = false) => {
        if (body[key] === undefined) return
        if (body[key] === null) {
          base[key] = null
          return
        }
        const trimmed = String(body[key]).trim()
        base[key] = trimmed === '' && allowEmptyToNull ? null : trimmed === '' ? undefined : trimmed
        if (base[key] === undefined) delete base[key]
      }
      if (body.name !== undefined) {
        const name = String(body.name ?? '').trim()
        if (!name) throw new Error('name must not be empty')
        base.name = name
      }
      copyString('code', true)
      copyString('skuCode', true)
      copyString('description', true)
      copyString('image', true)
      if (body.unitId !== undefined || body.unit !== undefined) {
        const raw = body.unitId ?? body.unit
        base.unitId = raw === null || raw === '' ? null : Number(raw)
        if (base.unitId !== null && !Number.isFinite(base.unitId as number)) throw new Error('Invalid unitId')
      }
      for (const f of PRICE_FIELDS) {
        if (body[f] !== undefined) base[f] = toPrice(body[f], f)
      }
      if (body.isNegative !== undefined) base.isNegative = Boolean(body.isNegative)
      if (body.isActive !== undefined) base.isActive = Boolean(body.isActive)
      base.type = nextType

      // Duplicate barcode / SKU guard (vendor scope, excluding self)
      const duplicateOr: Record<string, unknown>[] = []
      if (base.code) duplicateOr.push({ code: base.code })
      if (base.skuCode) duplicateOr.push({ skuCode: base.skuCode })
      if (duplicateOr.length > 0) {
        const clash = await Product.findOne({
          where: { vendorId, [Op.or]: duplicateOr, id: { [Op.ne]: productId } },
          transaction: t
        })
        if (clash) throw ApiError.conflict('Product already exists or code/skuCode is duplicated')
      }

      await product.update(base, { transaction: t })

      if (body.categories !== undefined) {
        await (product as any).$set('categories', body.categories || [], { transaction: t })
      }
      if (body.tags !== undefined) {
        await (product as any).$set('tags', body.tags || [], { transaction: t })
      }

      if (nextType === PRODUCT_TYPE.SIMPLE) {
        // Switching back to simple soft-removes all variant rows.
        // Inventory rows are kept for audit (paranoid); do not destroy them.
        if (existingVariantCount > 0) {
          const rows: any[] = await (database as any).productVariant.findAll({
            where: { productId },
            transaction: t
          })
          for (const row of rows) {
            await row.destroy({ transaction: t })
          }
        }
        if (body.quantity !== undefined && body.quantity !== null && String(body.quantity) !== '') {
          if (!warehouseId) throw new Error('warehouseId is required to update quantity')
          await assertWarehouseAccess(warehouseId, getVendorScope(req))
          await this.adjustSimpleStock(productId, Number(body.quantity), warehouseId, t)
        }
      } else if (nextType === PRODUCT_TYPE.VARIANT) {
        const variants = body.variants
        const removedVariantIds = body.removedVariantIds || []
        if (variants !== undefined || (removedVariantIds && removedVariantIds.length > 0)) {
          if (!Array.isArray(variants ?? [])) throw new Error('variants must be an array')
          await this.applyVariantSync(product, vendorId, variants || [], removedVariantIds, warehouseId, t)
        }
      }
      // Combo (2): base fields only; variant payload intentionally ignored.

      await t.commit()
      return await (database as any).product.findOne({
        where: { id: productId },
        include: [
          { model: Category, through: { attributes: [] } },
          { model: Tag, through: { attributes: [] } },
          { model: Unit, attributes: ['id', 'name'] },
          {
            model: ProductVariant,
            as: 'variants',
            include: [
              {
                model: ProductAttributeValue,
                as: 'attributeValues',
                attributes: ['id', 'value', 'attributeId'],
                through: { attributes: [] },
                include: [{ model: database.productAttribute, attributes: ['id', 'name'] }]
              }
            ]
          }
        ]
      })
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /**
   * Shared variant upsert/delete core used by `updateProduct`.
   * Handles per-variant barcode (`code`): manual value wins, blank clears to
   * null, missing auto-extends `{productCode}-{segments}` when possible.
   */
  private async applyVariantSync(
    product: any,
    vendorId: number,
    variants: any[],
    removedVariantIds: any[],
    warehouseId: number | null,
    t: any
  ) {
    const productId = Number(product.id ?? product.get?.('id'))
    for (const rawId of removedVariantIds || []) {
      const variant = await (database as any).productVariant.findByPk(Number(rawId), { transaction: t })
      if (!variant) continue
      if (Number(variant.productId ?? variant.get?.('productId')) !== productId) continue
      // Paranoid soft-delete: keep inventory/order history, hide variant from sales.
      await variant.destroy({ transaction: t })
    }

    const currentVariants: any[] = await (database as any).productVariant.findAll({
      where: { productId },
      include: [{ model: database.productAttributeValue, as: 'attributeValues', through: { attributes: [] } }],
      transaction: t
    })
    // Include soft-deleted SKUs/codes so auto-generation never violates the
    // DB unique [productId, skuCode] occupied by a paranoid-deleted row.
    const deletedVariants: any[] = await (database as any).productVariant.findAll({
      where: { productId },
      paranoid: false,
      attributes: ['skuCode', 'code', 'deletedAt'],
      transaction: t
    }).then((rows: any[]) => rows.filter((r: any) => r.get?.('deletedAt')))
    const productCode = (product as any).code ?? product.get?.('code') ?? null
    const baseSku = (product as any).skuCode || (product as any).code || String(productId)
    let skuTemplate: string | undefined
    try {
      const settings = await new SettingService().getForVendor(vendorId)
      skuTemplate = settings?.skuTemplate ?? undefined
    } catch (e) {
      console.warn('settings not available for variant sku generation', e)
    }
    const takenSkus = new Set<string>([
      baseSku,
      ...currentVariants.map((v: any) => v.get('skuCode')),
      ...deletedVariants.map((v: any) => v.get('skuCode'))
    ])
    const takenCodes = new Set<string>(
      [...currentVariants, ...deletedVariants]
        .map((v: any) => String(v.get('code') ?? '').trim())
        .filter(Boolean)
    )
    if (productCode) takenCodes.add(String(productCode).trim())

    const vendorAttrs: any[] = await ProductAttribute.findAll({ where: { vendorId }, transaction: t })
    const allValues: any[] =
      vendorAttrs.length > 0
        ? await ProductAttributeValue.findAll({
            where: { attributeId: vendorAttrs.map((a: any) => a.id) },
            include: [{ model: ProductAttribute, attributes: ['id', 'name', 'vendorId'] }],
            transaction: t
          })
        : []
    const valueById = new Map(allValues.map((v: any) => [Number(v.id), v]))
    const valueByName = new Map<string, any>()
    for (const v of allValues as any[]) {
      const attrName = v.attribute?.name ?? v.productAttribute?.name ?? ''
      valueByName.set(`${String(attrName).trim().toLowerCase()}::${String(v.value).trim().toLowerCase()}`, v)
    }

    for (const v of variants || []) {
      let valIds: number[] = Array.isArray(v.attributeValues)
        ? v.attributeValues.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n))
        : []
      if (!valIds.length && (v.optionValues || v.options)) {
        const opts: Record<string, string> = v.optionValues || v.options || {}
        for (const [name, val] of Object.entries(opts)) {
          const row = valueByName.get(`${String(name).trim().toLowerCase()}::${String(val).trim().toLowerCase()}`)
          if (row) valIds.push(Number(row.id))
        }
        valIds = [...new Set(valIds)]
      }
      if (!valIds.length) continue
      for (const vid of valIds) {
        const row = valueById.get(Number(vid))
        if (!row) throw new Error(`Invalid attributeValue ${vid}`)
        if (Number(row.attribute?.vendorId ?? row.productAttribute?.vendorId) !== vendorId)
          throw new Error('Attribute value vendor mismatch')
      }

      const fields: Record<string, unknown> = {
        ...(v.skuCode ? { skuCode: String(v.skuCode).trim() } : {}),
        ...(v.salePrice !== undefined && v.salePrice !== '' ? { salePrice: toPrice(v.salePrice, 'salePrice') } : {}),
        ...(v.regularPrice !== undefined && v.regularPrice !== ''
          ? { regularPrice: toPrice(v.regularPrice, 'regularPrice') }
          : {}),
        ...(v.wholeSalePrice !== undefined && v.wholeSalePrice !== ''
          ? { wholeSalePrice: toPrice(v.wholeSalePrice, 'wholeSalePrice') }
          : {}),
        ...(v.costPrice !== undefined && v.costPrice !== '' ? { costPrice: toPrice(v.costPrice, 'costPrice') } : {}),
        isNegative: Boolean(v.isNegative),
        ...(v.isActive !== undefined ? { isActive: Boolean(v.isActive) } : {})
      }

      let existing: any = null
      const variantId = v.id ?? v.variantId
      if (variantId) existing = await (database as any).productVariant.findByPk(Number(variantId), { transaction: t })
      if (!existing && valIds.length) {
        const key = [...valIds].sort((a, b) => a - b).join(',')
        existing = currentVariants.find((cv: any) => {
          const ids = ((cv.get('attributeValues') || []) as any[])
            .map((av: any) => Number(av.id))
            .sort((a: number, b: number) => a - b)
            .join(',')
          return ids === key
        })
      }

      const valsForCode = valIds.map((id) => valueById.get(id)).filter(Boolean)
      const codeSegments = valsForCode.map((val: any) => String(val.value ?? ''))

      if (existing) {
        if (Number(existing.productId ?? existing.get?.('productId')) !== productId)
          throw new Error('Variant does not belong to product')
        if (!fields.skuCode) delete (fields as any).skuCode
        const nextCode =
          v.code !== undefined
            ? resolveVariantCode(productCode, v.code, codeSegments, takenCodes, { allowBlankUpdate: false })
            : undefined
        if (nextCode !== undefined) (fields as any).code = nextCode
        await existing.update(fields, { transaction: t })
        if (valIds.length) await existing.$set('attributeValues', valIds, { transaction: t })
        if (v.quantity !== undefined && v.quantity !== null && v.quantity !== '' && warehouseId) {
          await this.adjustVariantStock(existing, Number(v.quantity), Number(warehouseId), t)
        }
      } else {
        let skuCode = (fields as any).skuCode as string | undefined
        if (!skuCode) {
          const optMap: Record<string, string> = {}
          for (const val of valsForCode as any[]) optMap[String(val.attributeId)] = String(val.value)
          skuCode = buildVariantSkuWithTemplate(skuTemplate, baseSku, optMap as any, takenSkus)
        }
        takenSkus.add(skuCode as string)
        const variantCode = resolveVariantCode(productCode, (v as any).code, codeSegments, takenCodes)
        const variantRow: any = await (database as any).productVariant
          .build({ productId, code: variantCode, skuCode, ...fields })
          .save({ transaction: t })
        if (valIds.length) await variantRow.$set('attributeValues', valIds, { transaction: t })
        const qty = Number(v.quantity ?? 0)
        if (qty !== 0 && warehouseId) {
          await (database as any).inventory
            .build({ warehouseId, quantity: qty, productId, variantId: variantRow.get('id') })
            .save({ transaction: t })
          await (database as any).transfer
            .build({ fromWarehouseId: warehouseId, quantity: qty, productId, variantId: variantRow.get('id'), type: '0' })
            .save({ transaction: t })
        }
      }
    }
  }

  /** Set simple product stock to `target`, logging the delta as a transfer */
  private async adjustSimpleStock(productId: number, target: number, warehouseId: number, t: any) {
    if (!Number.isFinite(target)) throw new Error('Invalid quantity')
    const row: any = await (database as any).inventory.findOne({
      where: { productId, variantId: null, warehouseId },
      transaction: t
    })
    const current = Number(row?.get('quantity') ?? 0)
    const delta = target - current
    if (!row && target !== 0) {
      await (database as any).inventory
        .build({ warehouseId, quantity: target, productId, variantId: null })
        .save({ transaction: t })
    } else if (row) {
      await row.update({ quantity: target }, { transaction: t })
    }
    if (delta !== 0) {
      await (database as any).transfer
        .build({ fromWarehouseId: warehouseId, quantity: Math.abs(delta), productId, type: delta > 0 ? '0' : '1' })
        .save({ transaction: t })
    }
  }

  /** Set a variant's stock to `target` in a warehouse, logging the delta as a transfer */
  private async adjustVariantStock(variant: any, target: number, warehouseId: number, t: any) {
    const row: any = await (database as any).inventory.findOne({
      where: { productId: variant.get('productId'), variantId: variant.get('id'), warehouseId },
      transaction: t
    })
    const current = Number(row?.get('quantity') ?? 0)
    const delta = target - current
    if (!row && target !== 0) {
      await (database as any).inventory
        .build({
          warehouseId,
          quantity: target,
          productId: variant.get('productId'),
          variantId: variant.get('id')
        })
        .save({ transaction: t })
    } else if (row) {
      await row.update({ quantity: target }, { transaction: t })
    }
    if (delta !== 0) {
      await (database as any).transfer
        .build({
          fromWarehouseId: warehouseId,
          quantity: Math.abs(delta),
          productId: variant.get('productId'),
          variantId: variant.get('id'),
          type: delta > 0 ? '0' : '1'
        })
        .save({ transaction: t })
    }
  }

  /**
   * Soft-delete a product (paranoid) + its variants.
   * Works for simple (0), variant (1) and combo (2) — combo has no
   * component table yet, so only the combo row + its own variants are hidden.
   * Orders / inventories / transfers / stocktakes / financial records are kept.
   */
  async deleteProduct(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const productId = Number((req.params as any).id)
      if (!productId) throw new Error('product id is required')
      const product: any = await (database as any).product.findByPk(productId, { transaction: t })
      if (!product) throw ApiError.notFound(`Product ${productId} not found`)
      assertVendorAccess(
        getVendorScope(req),
        Number(product.vendorId ?? product.get?.('vendorId')),
        'Unauthorized to delete this product'
      )
      const variants: any[] = await (database as any).productVariant.findAll({
        where: { productId },
        transaction: t
      })
      for (const v of variants) await v.destroy({ transaction: t })
      await product.destroy({ transaction: t })
      await t.commit()
      return { message: 'Product deleted successfully', id: productId }
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /** Restore a paranoid-deleted product + its variants. */
  async restoreProduct(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const productId = Number((req.params as any).id)
      if (!productId) throw new Error('product id is required')
      const product: any = await (database as any).product.findByPk(productId, {
        paranoid: false,
        transaction: t
      })
      if (!product) throw ApiError.notFound(`Product ${productId} not found`)
      assertVendorAccess(
        getVendorScope(req),
        Number(product.vendorId ?? product.get?.('vendorId')),
        'Unauthorized to restore this product'
      )
      if (!product.get('deletedAt')) {
        await t.rollback()
        return { message: 'Product is not deleted', id: productId }
      }
      const vendorId = Number(product.vendorId ?? product.get?.('vendorId'))
      const code = product.get('code')
      const skuCode = product.get('skuCode')
      const clashOr: Record<string, unknown>[] = []
      if (code) clashOr.push({ code })
      if (skuCode) clashOr.push({ skuCode })
      if (clashOr.length > 0) {
        const clash = await (database as any).product.findOne({
          where: { vendorId, [Op.or]: clashOr, id: { [Op.ne]: productId } },
          transaction: t
        })
        if (clash) throw ApiError.conflict('Cannot restore: code/skuCode is reused by another product')
      }
      await product.restore({ transaction: t })
      await (database as any).productVariant.restore({
        where: { productId },
        transaction: t
      })
      await t.commit()
      return { message: 'Product restored successfully', id: productId }
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /** Soft-delete a single variant; keeps its inventory/order history. */
  async deleteVariant(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const productId = Number((req.params as any).id)
      const variantId = Number((req.params as any).variantId)
      if (!productId || !variantId) throw new Error('product id and variant id are required')
      const product: any = await (database as any).product.findByPk(productId, { transaction: t })
      if (!product) throw ApiError.notFound(`Product ${productId} not found`)
      assertVendorAccess(
        getVendorScope(req),
        Number(product.vendorId ?? product.get?.('vendorId')),
        'Unauthorized to delete this variant'
      )
      const variant: any = await (database as any).productVariant.findByPk(variantId, { transaction: t })
      if (!variant || Number(variant.get('productId')) !== productId)
        throw ApiError.notFound(`Variant ${variantId} not found for product ${productId}`)
      await variant.destroy({ transaction: t })
      await t.commit()
      return { message: 'Variant deleted successfully', id: variantId }
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }
}
