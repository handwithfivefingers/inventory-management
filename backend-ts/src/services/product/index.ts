import database from '#/database'
import Category from '#/database/models/category'
import Inventory from '#/database/models/inventory'
import Product from '#/database/models/product'
import ProductAttribute from '#/database/models/productAttribute'
import ProductAttributeValue from '#/database/models/productAttributeValue'
import ProductVariant from '#/database/models/productVariant'
import ProductBarcode from '#/database/models/productBarcode'
import Order from '#/database/models/order'
import OrderDetail from '#/database/models/orderDetail'
import Invoice from '#/database/models/invoice'
import InvoiceDetail from '#/database/models/invoiceDetail'
import Tag from '#/database/models/tag'
import Unit from '#/database/models/units'
import { ApiError } from '#/response'
import { IRequestLocal } from '#/types/common'
import { getPagination } from '#/utils'
import { generateSkuFromTemplate, padSeq } from '#/utils/code-generator'
// Option A: product detail reads are uncached (fresh DB). `evictCachedEntity`
// stays only to purge legacy `product:<id>` keys written before this change.
import { evictCachedEntity } from '#/utils/entity-cache'
import { assertUniqueVariantSku, normalizeSku, assertValidSku } from '#/utils/sku'
import { nextSequence } from '#/utils/sequence'
import {
  assertVendorAccess,
  assertWarehouseAccess,
  getRequestedVendorId,
  getRequestedWarehouseId,
  getVendorScope,
  TVendorScope
} from '#/utils/tenant'
import { Op, Sequelize, Transaction } from 'sequelize'
import { SettingService } from '../setting'
import { ProductAttributeServices } from './productAttribute'
import { ProductExcelService } from './product-excel.service'
import { searchProducts, ProductSearchParams } from './product-search.service'
import { resolveStringField, toVat } from './helper'
import { syncVariantBarcodes } from './product-barcode'
import { adjustStock, adjustStockByBarcode } from './product-stock'
import { CreateProductParams, PRODUCT_TYPE, ProductType, UpdateProductParams } from './product.types'
import { applyVariantSync, createVariants, ensureDefaultVariant } from './product-variant'

export { PRODUCT_TYPE }

export const getVariantTransitionBlockReason = async (
  productId: number,
  transaction?: Transaction
): Promise<string | null> => {
  const order = await OrderDetail.findOne({
    where: { productId },
    include: [{ model: Order, as: 'order', where: { status: 'draft' }, attributes: ['id'] }],
    transaction
  })
  if (order) {
    return 'Cannot change a simple product to variants while an order for this product is being processed.'
  }

  // A completed order status alone is not enough: wholesale/online orders can
  // be marked completed before their invoice is issued. Keep the product
  // simple until the order line has a finalized (issued or paid) invoice.
  const uncompletedInvoiceLine = await OrderDetail.findOne({
    where: { productId },
    include: [
      {
        model: InvoiceDetail,
        as: 'invoiceDetails',
        required: false,
        include: [
          {
            model: Invoice,
            as: 'invoice',
            required: false,
            where: { status: { [Op.in]: ['issued', 'paid'] } },
            attributes: ['id']
          }
        ]
      }
    ],
    transaction
  })

  if (uncompletedInvoiceLine && !(uncompletedInvoiceLine as any).invoiceDetails?.length) {
    return 'Cannot change a simple product to variants until the order has a completed invoice.'
  }
  return null
}

export const assertNoProcessingOrders = async (productId: number, transaction?: Transaction): Promise<void> => {
  const reason = await getVariantTransitionBlockReason(productId, transaction)
  if (reason) throw ApiError.conflict(reason)
}

export class ProductService {
  sequelize: Sequelize = database.sequelize

  private readonly excel = new ProductExcelService()
  private readonly attributes = new ProductAttributeServices()

  private rejectLegacyBarcodePriceFields(payload: Record<string, any>) {
    const legacy = ['code', 'salePrice', 'regularPrice', 'wholeSalePrice', 'costPrice']
    const found =
      legacy.find((field) => payload[field] !== undefined) ||
      (payload.variants?.find?.((variant: any) => legacy.some((field) => variant[field] !== undefined)) &&
        'variants[].legacy field')
    if (found) throw ApiError.badRequest(`Legacy ${found} is no longer accepted; use variants[].barcodes`)
  }

  // ---- Excel import/export (delegated to ProductExcelService) -----------
  exportExcel(req: IRequestLocal) {
    return this.excel.exportExcel(req)
  }
  importTemplateExcel() {
    return this.excel.importTemplateExcel()
  }
  importExcel(req: IRequestLocal) {
    return this.excel.importExcel(req)
  }

  getProductAttributes(req: IRequestLocal) {
    const vendorId = req.headers['x-vendor'] as string
    return this.attributes.getAttributes({ vendorId })
  }
  createAttribute(req: IRequestLocal) {
    return this.attributes.createAttribute(req)
  }
  updateAttribute(req: IRequestLocal) {
    return this.attributes.updateAttribute(req)
  }
  deleteAttribute(req: IRequestLocal) {
    return this.attributes.deleteAttribute(req)
  }

  /* ------------------------------------------------------------------ */
  /* Create                                                              */
  /* ------------------------------------------------------------------ */

  async create(params: CreateProductParams) {
    const t = await this.sequelize.transaction()
    try {
      this.rejectLegacyBarcodePriceFields(params as any)

      const { warehouseId, vendorId, variants, categories, tags, type = PRODUCT_TYPE.SIMPLE, ...rest } = params

      console.log(`params`, params)

      const productParams: Record<string, any> = { ...rest, type }

      if (productParams.skuCode !== undefined && productParams.skuCode !== null) {
        const raw = String(productParams.skuCode).trim()
        if (raw === '') {
          delete productParams.skuCode
        } else {
          productParams.skuCode = assertValidSku(raw, 'sku')
        }
      }

      const isExist = await this.isExist({
        skuCode: productParams.skuCode || null,
        vendorId
      })

      if (isExist) throw ApiError.conflict('Product already exists or code/skuCode is duplicated')

      const settings = await this.tryLoadSettings(vendorId)

      await this.assignProductCodes(productParams, settings, t)

      const product = await Product.create(this.buildProductFields(productParams, vendorId), { transaction: t })

      if (categories) await product.$set('categories', categories, { transaction: t })
      if (tags) await product.$set('tags', tags, { transaction: t })

      const stockResult = await this.createStockOrVariants({
        product,
        type,
        variants,
        warehouseId,
        vendorId,
        settings,
        defaultVariant: productParams,
        transaction: t
      })

      await t.commit()
      // Option A: no cache priming. The bare `dataValues` lack the includes
      // (variants/categories/tags/quantity) that `getProductById` returns,
      // so seeding it poisons the first detail read. Detail reads are
      // uncached DB hits now, so nothing needs priming here.
      return { product: product.dataValues, ...stockResult }
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status ?? 400)
    }
  }

  private buildProductFields(params: Record<string, any>, vendorId: number) {
    const { name, description, type, unitId } = params
    return { name, description, type, unitId, vendorId }
  }

  /** Best-effort settings load; product creation must not fail just because settings are unavailable. */
  private async tryLoadSettings(vendorId: number) {
    try {
      return await new SettingService().getForVendor(vendorId)
    } catch (e) {
      console.warn('settings not available for product code generation', e)
      return null
    }
  }

  /** Auto-generate `code`/`skuCode` from vendor settings when the caller didn't supply them. */
  private async assignProductCodes(productParams: Record<string, any>, settings: any, t?: Transaction, seqLength = 12) {
    if (productParams.skuCode) return

    const seq = await nextSequence('product', new Date().getFullYear(), {
      transaction: t,
      initial: (await Product.count()) + 1
    })
    // Barcodes are numeric and limited to 12 characters. Vendor barcode
    // prefixes/suffixes are no longer applied to this field.
    const seq12 = padSeq(seq, seqLength)

    if (!productParams.skuCode) {
      const baseCode = seq12
      productParams.skuCode = settings
        ? generateSkuFromTemplate(
            settings.skuTemplate,
            { CODE: baseCode, SEQ: seq12, YYYY: String(new Date().getFullYear()) },
            baseCode
          )
        : baseCode
    }
    // Canonical form: trim + uppercase (validated by callers / variant helpers).
    if (productParams.skuCode) productParams.skuCode = normalizeSku(productParams.skuCode)
  }

  /**
   * Create opening stock for a simple product, or the variant rows (+ their
   * stock) for a variant product. Returns the piece of the `create()`
   * response specific to that branch.
   */
  private async createStockOrVariants(args: {
    product: any
    type: ProductType
    variants: CreateProductParams['variants']
    warehouseId: number
    vendorId: number
    settings: any
    defaultVariant: Record<string, any>
    transaction: Transaction
  }) {
    const { product, type, variants, warehouseId, vendorId, settings, defaultVariant, transaction } = args

    if (Number(type) === PRODUCT_TYPE.VARIANT) {
      const hasConfiguredAttributes = (variants || []).some(
        (variant) =>
          (variant.attributeValues?.length ?? 0) > 0 ||
          Object.keys(variant.options || variant.optionValues || {}).length > 0
      )
      const variantContext = {
        productId: product.id,
        vendorId,
        warehouseId,
        baseSku: defaultVariant.skuCode || String(product.id),
        skuTemplate: settings?.skuTemplate,
        defaultUnitId: product.get?.('unitId') ?? product.unitId,
        transaction
      }
      // A product is never allowed to be created without a sellable row.
      // Empty/no-attribute payloads are simple products represented by the
      // standard default variant, even when an older client sends type=VARIANT.
      const created = hasConfiguredAttributes
        ? await createVariants(variants || [], variantContext)
        : await ensureDefaultVariant(
            { barcodes: variants?.[0]?.barcodes, quantity: variants?.[0]?.quantity ?? 0 },
            variantContext
          )
      return { variants: created }
    }

    // Simple products are represented by exactly one default variant.

    const created = await ensureDefaultVariant(
      {
        barcodes: variants?.[0]?.barcodes,
        VAT: defaultVariant.VAT,
        imageUrl: defaultVariant.imageUrl ?? defaultVariant.image ?? null,
        isNegative: defaultVariant.isNegative,
        quantity: variants?.[0]?.quantity || 0
      },
      {
        productId: product.id,
        vendorId,
        warehouseId,
        baseSku: String(product.id),
        skuTemplate: settings?.skuTemplate,
        defaultUnitId: product.get?.('unitId') ?? product.unitId,
        transaction
      }
    )
    return { variants: created }
  }

  /* ------------------------------------------------------------------ */
  /* Read                                                                */
  /* ------------------------------------------------------------------ */

  async getProducts(req: IRequestLocal) {
    try {
      const { s } = req.query as any
      const rawVendorId = getRequestedVendorId(req)
      const scope = getVendorScope(req)
      const { offset, limit } = getPagination(req.query)

      const vendorWhereClause = (() => {
        if (rawVendorId != null && String(rawVendorId).trim() !== '') {
          assertVendorAccess(scope, Number(rawVendorId), 'Unauthorized vendor filter')
          return { vendorId: Number(rawVendorId) }
        }
        return scope === null ? {} : { vendorId: { [Op.in]: scope } }
      })()

      const queryParams: any = {
        where: { ...vendorWhereClause },
        include: [
          {
            model: ProductVariant,
            as: 'variants',
            paranoid: true,
            required: false,
            // attributes: [],
            include: [
              { model: ProductBarcode, as: 'barcodes', include: [{ model: Unit, as: 'unit' }] },
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
              database.sequelize.literal(
                '(SELECT COALESCE(SUM(sold), 0) FROM productVariants WHERE productVariants.productId = product.id)'
              ),
              'sold'
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
        const matchedVariants: any[] = await ProductVariant.findAll({
          where: { skuCode: { [Op.startsWith]: s } },
          attributes: ['productId'],
          raw: true
        })
        const variantMatchedProductIds = [
          ...new Set(matchedVariants.map((variant: any) => Number(variant.productId)).filter(Boolean))
        ]
        const barcodeMatches: any[] = await ProductBarcode.findAll({
          where: { barcode: { [Op.startsWith]: s } },
          attributes: ['variantId'],
          raw: true
        })
        const barcodeVariantIds = barcodeMatches.map((row: any) => Number(row.variantId)).filter(Boolean)
        if (barcodeVariantIds.length) {
          const barcodeVariants: any[] = await ProductVariant.findAll({
            where: { id: { [Op.in]: barcodeVariantIds } },
            attributes: ['productId'],
            raw: true
          })
          variantMatchedProductIds.push(...barcodeVariants.map((row: any) => Number(row.productId)).filter(Boolean))
        }
        queryParams.where = {
          [Op.or]: [
            { name: { [Op.startsWith]: s } },
            ...(variantMatchedProductIds.length ? [{ id: { [Op.in]: variantMatchedProductIds } }] : [])
          ],
          ...queryParams.where
        }
      }

      const { rows, count } = await Product.findAndCountAll(queryParams)
      return { rows, count }
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  async getProductById({ id, vendorId }: { id: string; warehouseId: string | number; vendorId: string | number }) {
    try {
      const product = await Product.findOne({
        where: { id },
        include: [
          { model: Inventory, attributes: [] },
          { model: Category, attributes: ['id', 'name'], through: { attributes: [] } },
          { model: Tag, attributes: ['id', 'name'], through: { attributes: [] } },
          { model: Unit, attributes: ['id', 'name'] },
          {
            model: ProductVariant,
            as: 'variants',
            include: [
              { model: ProductBarcode, as: 'barcodes', include: [{ model: Unit, as: 'unit' }] },
              { model: Inventory },
              {
                model: ProductAttributeValue,
                as: 'attributeValues',
                attributes: ['id', 'value', 'attributeId'],
                through: { attributes: [] },
                include: [{ model: ProductAttribute, attributes: ['id', 'name'] }]
              }
            ]
          }
        ],
        attributes: {
          include: [
            [
              database.sequelize.literal(
                '(SELECT COALESCE(SUM(sold), 0) FROM productVariants WHERE productVariants.productId = product.id)'
              ),
              'sold'
            ],
            [database.sequelize.col('inventories.quantity'), 'quantity'],
            [database.sequelize.col('unit.id'), 'unitId'],
            [database.sequelize.col('unit.name'), 'unitName']
          ]
        }
      })
      if (!product) return product

      const productVendorId = Number((product as any).vendorId ?? product.get?.('vendorId'))

      if (vendorId != null && String(vendorId).trim() !== '' && productVendorId !== Number(vendorId)) {
        throw Object.assign(new Error('Unauthorized to view this product'), { status: 403 })
      }

      if (Number((product as any).type ?? product.get?.('type')) === PRODUCT_TYPE.SIMPLE) {
        const variantTransitionBlockReason = await getVariantTransitionBlockReason(Number(id))
        product.setDataValue('variantTransitionBlocked', Boolean(variantTransitionBlockReason))
        product.setDataValue('variantTransitionBlockReason', variantTransitionBlockReason)
      }
      return product
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /** Detail contract for product editing. Stock is warehouse-scoped and each
   * selling unit gets a precomputed quotient/remainder display value. */
  async getProductFull({ id, warehouseId, vendorId }: { id: string; warehouseId: string | number; vendorId: string | number }) {
    if (!warehouseId) throw ApiError.forbidden('warehouseId is required', { code: 'FORBIDDEN' })
    const product: any = await this.getProductById({ id, warehouseId, vendorId })
    if (!product) throw ApiError.notFound('Product not found', { code: 'NOT_FOUND' })
    const plain = product.get({ plain: true })
    plain.variants = (plain.variants || []).map((variant: any) => {
      const baseQuantity = Number((variant.inventories || []).find((row: any) => Number(row.warehouseId) === Number(warehouseId))?.quantity ?? 0)
      const barcodes = [...(variant.barcodes || [])]
        .sort((a: any, b: any) => Number(a.conversionRate) - Number(b.conversionRate))
        .map((row: any) => {
          const rate = Number(row.conversionRate)
          return { ...row, stock: { baseQuantity, quantity: Math.floor(baseQuantity / rate), remainder: baseQuantity % rate } }
        })
      // The edit contract intentionally excludes raw inventory rows: exposing
      // every warehouse here made clients accidentally sum stock across sites.
      const { inventories: _inventories, ...variantWithoutInventories } = variant
      return { ...variantWithoutInventories, baseQuantity, barcodes }
    })
    return plain
  }

  async adjustStockByBarcode(params: { barcode: string; quantity: number; type: 'IN' | 'OUT'; warehouseId: number }) {
    const t = await this.sequelize.transaction()
    try {
      const result = await adjustStockByBarcode({ ...params, transaction: t })
      await t.commit()
      return result
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status ?? 400)
    }
  }

  /**
   * List variants of a product with their attribute combination and,
   * optionally, per-warehouse stock. GET /products/:id/variants?warehouseId=1
   */
  async getProductVariants(req: IRequestLocal) {
    try {
      const productId = Number((req.params as any).id)
      const warehouseId = getRequestedWarehouseId(req) ? Number(getRequestedWarehouseId(req)) : null
      if (!productId) throw new Error('product id is required')

      const product: any = await Product.findByPk(productId)
      if (!product) throw new Error(`Product ${productId} not found`)
      assertVendorAccess(
        getVendorScope(req),
        Number(product.vendorId ?? product.get?.('vendorId')),
        'Unauthorized to view this product'
      )

      const inventoryInclude: any = {
        model: database.inventory,
        attributes: ['id', 'warehouseId', 'quantity', 'variantId']
      }
      if (warehouseId) inventoryInclude.where = { warehouseId }

      return await ProductVariant.findAndCountAll({
        where: { productId },
        include: [
          {
            model: ProductAttributeValue,
            as: 'attributeValues',
            attributes: ['id', 'value'],
            through: { attributes: [] },
            include: [{ model: ProductAttribute, attributes: ['id', 'name'] }]
          },
          inventoryInclude
        ] as any,
        order: [['id', 'ASC']]
      })
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /** Barcode-management route: a flat list makes unit-price administration simple for clients. */
  async getProductBarcodes(req: IRequestLocal) {
    const productId = Number((req.params as any).id)
    if (!productId) throw ApiError.badRequest('product id is required')
    const product: any = await Product.findByPk(productId)
    if (!product) throw ApiError.badRequest(`Product ${productId} not found`)
    assertVendorAccess(getVendorScope(req), Number(product.get('vendorId')), 'Unauthorized to view this product')
    return ProductBarcode.findAll({
      include: [
        {
          model: ProductVariant,
          required: true,
          where: { productId },
          attributes: ['id', 'skuCode', 'VAT', 'isActive']
        },
        { model: Unit, attributes: ['id', 'name'] }
      ],
      order: [
        ['variantId', 'ASC'],
        ['conversionRate', 'ASC'],
        ['id', 'ASC']
      ]
    })
  }

  /* ------------------------------------------------------------------ */
  /* Unified search (POS & Admin)                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Unified product query for POS/Sell and Admin views.
   * - Branch 1: exact barcode/SKU scan match (both contexts).
   * - Branch 2: POS returns variant-level rows (never cached); Admin
   *   returns product-level aggregates with `total_count` for pagination.
   */
  async search(params: ProductSearchParams, vendorScope: TVendorScope) {
    try {
      return await searchProducts(params, vendorScope)
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /* ------------------------------------------------------------------ */
  /* Update                                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Unified update for simple / variant / combo products.
   * - `type`: 0 simple, 1 variant, 2 combo. Falls back to the stored type,
   *   then to variant-row existence for legacy rows.
   * - Simple (0): updates base fields + product-level stock (`quantity`
   *   requires `warehouseId`).
   * - Variant (1): updates base fields (prices/quantity on the parent are
   *   ignored) and syncs `variants`/`removedVariantIds` in the same txn.
   * - Combo (2): base fields only for now; variant payload is ignored.
   */
  async updateProduct(params: UpdateProductParams) {
    const t = await this.sequelize.transaction()
    try {
      this.rejectLegacyBarcodePriceFields(params as any)
      const product = await Product.findByPk(params.id, { transaction: t })
      if (!product) throw new Error(`Product ${params.id} not found`)
      const vendorId = Number(product.vendorId ?? product.get?.('vendorId'))

      const existingVariantCount = await ProductVariant.count({ where: { productId: params.id }, transaction: t })

      const storedType = Number(product.type ?? product.get?.('type') ?? (existingVariantCount > 0 ? 1 : 0))

      const nextType = (
        params.type !== undefined && params.type !== null && String(params.type) !== ''
          ? Number(params.type)
          : storedType
      ) as ProductType

      if (![0, 1, 2].includes(nextType)) throw new Error('Invalid type: must be 0 (simple), 1 (variant) or 2 (combo)')

      if (storedType === PRODUCT_TYPE.SIMPLE && nextType === PRODUCT_TYPE.VARIANT) {
        await assertNoProcessingOrders(Number(params.id), t)
      }

      const base = this.buildUpdateFields(params, nextType)

      await product.update(base, { transaction: t })

      if (params.categories !== undefined) await product.$set('categories', params.categories || [], { transaction: t })
      if (params.tags !== undefined) await product.$set('tags', params.tags || [], { transaction: t })

      if (nextType === PRODUCT_TYPE.SIMPLE) {
        await this.switchToSimple(params, existingVariantCount, t)
      } else if (nextType === PRODUCT_TYPE.VARIANT) {
        const variantSync = await this.syncVariants(product, vendorId, params, t, storedType === PRODUCT_TYPE.SIMPLE)
        await t.commit()
        // A removal of sold data is intentionally non-fatal. The client can
        // notify the user that those variants were deactivated instead.
        await evictCachedEntity('product', params.id)
        return {
          success: true,
          softDeletedVariantIds: variantSync.softDeletedVariantIds,
          warnings: variantSync.softDeletedVariantIds.map((id) => ({
            code: 'VARIANT_SOFT_DELETED',
            variantId: id,
            message: `Variant ${id} has order history and was set to INACTIVE instead of deleted.`
          }))
        }
      }
      // Combo (2): base fields only; variant payload intentionally ignored.

      await t.commit()
      // DB succeeded first -> evict `product:<id>` to avoid stale reads.
      await evictCachedEntity('product', params.id)
      return true
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /** Whitelist + normalize the base (non-variant) fields for `updateProduct`. */
  private buildUpdateFields(params: UpdateProductParams, nextType: ProductType): Record<string, unknown> {
    const base: Record<string, unknown> = { type: nextType }
    const setField = (key: string, value: string | null | undefined) => {
      if (value !== undefined) base[key] = value
    }

    if (params.name !== undefined) {
      const name = String(params.name ?? '').trim()
      if (!name) throw new Error('name must not be empty')
      base.name = name
    }
    setField('description', resolveStringField(params.description, true))

    if (params.unitId !== undefined || params.unit !== undefined) {
      const raw = params.unitId ?? params.unit
      base.unitId = raw === null ? null : Number(raw)
      if (base.unitId !== null && !Number.isFinite(base.unitId as number)) throw new Error('Invalid unitId')
    }
    return base
  }

  private async buildDefaultVariantFields(params: UpdateProductParams, existingVariantId?: number, t?: Transaction) {
    const fields: Record<string, unknown> = {}
    const rawSkuUpdate = (params as any).sku !== undefined ? (params as any).sku : params.skuCode
    const skuCode = resolveStringField(rawSkuUpdate, true)
    if (skuCode !== undefined && skuCode !== null) {
      const normalized = assertValidSku(skuCode, 'sku')
      await assertUniqueVariantSku(normalized, { excludeVariantId: existingVariantId, transaction: t as unknown })
      fields.skuCode = normalized
    }

    if (params.VAT !== undefined) fields.VAT = toVat(params.VAT)
    if (params.image !== undefined) fields.imageUrl = resolveStringField(params.image, true)
    if (params.isNegative !== undefined) fields.isNegative = Boolean(params.isNegative)
    if (params.isActive !== undefined) fields.isActive = Boolean(params.isActive)
    return fields
  }

  /** Switching (back) to simple keeps one default variant as the stock/price source of truth. */
  private async switchToSimple(params: UpdateProductParams, existingVariantCount: number, t: Transaction) {
    const rows: any[] = await ProductVariant.findAll({
      where: { productId: params.id },
      order: [['id', 'ASC']],
      transaction: t
    })
    let defaultVariant = rows[0]

    if (!defaultVariant) {
      const generatedSku = `P-${params.id}-DEFAULT`
      await assertUniqueVariantSku(generatedSku, { transaction: t as unknown })
      defaultVariant = await ProductVariant.create(
        {
          productId: params.id,
          skuCode: generatedSku,
          VAT: 0,
          isNegative: false,
          isActive: true
        },
        { transaction: t }
      )
    }

    const fields = await this.buildDefaultVariantFields(params, Number(defaultVariant.get('id')), t)
    if (Object.keys(fields).length) await defaultVariant.update(fields, { transaction: t })
    if (params.variants?.[0]?.barcodes) {
      const product: any = await Product.findByPk(params.id, { transaction: t })
      await syncVariantBarcodes(
        Number(defaultVariant.get('id')),
        Number(product.get('vendorId')),
        params.variants[0].barcodes,
        t,
        product.get('unitId')
      )
    }

    for (const row of rows.slice(1)) await row.destroy({ transaction: t })

    if (params.quantity !== undefined && params.quantity !== null && String(params.quantity) !== '') {
      if (!params.warehouseId) throw new Error('warehouseId is required to adjust quantity')
      await adjustStock({
        productId: params.id,
        variantId: Number(defaultVariant.get('id')),
        warehouseId: params.warehouseId,
        target: Number(params.quantity),
        transaction: t
      })
    }
  }

  private async syncVariants(
    product: any,
    vendorId: number,
    params: UpdateProductParams,
    t: Transaction,
    convertingFromSimple = false
  ): Promise<{ softDeletedVariantIds: number[] }> {
    const { variants, removedVariantIds = [] } = params
    if (variants === undefined && removedVariantIds.length === 0) return { softDeletedVariantIds: [] }
    if (!Array.isArray(variants ?? [])) throw new Error('variants must be an array')
    const defaultVariant = convertingFromSimple
      ? await ProductVariant.findOne({ where: { productId: params.id }, order: [['id', 'ASC']], transaction: t })
      : null
    const syncResult = await applyVariantSync(
      product,
      vendorId,
      variants || [],
      removedVariantIds,
      params.warehouseId ?? null,
      t,
      defaultVariant ? Number(defaultVariant.get('id')) : undefined
    )
    const remaining = await ProductVariant.count({ where: { productId: params.id }, transaction: t })
    if (remaining === 0) {
      const settings = await this.tryLoadSettings(vendorId)
      await ensureDefaultVariant(
        { skuCode: `P-${params.id}-DEFAULT`, quantity: 0 },
        {
          productId: Number(params.id),
          vendorId,
          warehouseId: Number(params.warehouseId),
          baseSku: String(params.id),
          skuTemplate: settings?.skuTemplate,
          defaultUnitId: product.get?.('unitId') ?? product.unitId,
          transaction: t
        }
      )
    }
    return syncResult
  }

  /* ------------------------------------------------------------------ */
  /* Delete / restore                                                    */
  /* ------------------------------------------------------------------ */

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
      const product: any = await Product.findByPk(productId, { transaction: t })
      if (!product) throw ApiError.notFound(`Product ${productId} not found`)
      assertVendorAccess(
        getVendorScope(req),
        Number(product.vendorId ?? product.get?.('vendorId')),
        'Unauthorized to delete this product'
      )

      const variants: any[] = await ProductVariant.findAll({ where: { productId }, transaction: t })
      for (const v of variants) await v.destroy({ transaction: t })
      await product.destroy({ transaction: t })

      await t.commit()
      // DB succeeded first -> evict `product:<id>` to avoid stale reads.
      await evictCachedEntity('product', productId)
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
      const product: any = await Product.findByPk(productId, { paranoid: false, transaction: t })
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
      const clashOr: Record<string, unknown>[] = []
      if (product.get('code')) clashOr.push({ code: product.get('code') })
      if (product.get('skuCode')) clashOr.push({ skuCode: product.get('skuCode') })
      if (clashOr.length > 0) {
        const clash = await Product.findOne({
          where: { vendorId, [Op.or]: clashOr, id: { [Op.ne]: productId } },
          transaction: t
        })
        if (clash) throw ApiError.conflict('Cannot restore: code/skuCode is reused by another product')
      }

      await product.restore({ transaction: t })
      await ProductVariant.restore({ where: { productId }, transaction: t })

      await t.commit()
      // Restore resurrects the row -> evict so the next read reloads fresh.
      await evictCachedEntity('product', productId)
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

      const product: any = await Product.findByPk(productId, { transaction: t })
      if (!product) throw ApiError.notFound(`Product ${productId} not found`)
      assertVendorAccess(
        getVendorScope(req),
        Number(product.vendorId ?? product.get?.('vendorId')),
        'Unauthorized to delete this variant'
      )

      const variant: any = await ProductVariant.findByPk(variantId, { transaction: t })
      if (!variant || Number(variant.get('productId')) !== productId)
        throw ApiError.notFound(`Variant ${variantId} not found for product ${productId}`)

      await variant.destroy({ transaction: t })
      await t.commit()
      // Variant shape is embedded in the cached product -> evict parent.
      await evictCachedEntity('product', productId)
      return { message: 'Variant deleted successfully', id: variantId }
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /* ------------------------------------------------------------------ */
  /* Misc                                                                */
  /* ------------------------------------------------------------------ */

  async isExist({ code, skuCode, vendorId }: { code?: string | null; skuCode?: string | null; vendorId: number }) {
    const duplicateOr: Record<string, unknown>[] = []
    if (code) duplicateOr.push({ code })
    if (skuCode) duplicateOr.push({ skuCode })
    if (!duplicateOr.length) return false
    return Product.findOne({ where: { vendorId, [Op.or]: duplicateOr } })
  }
}
