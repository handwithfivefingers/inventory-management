import database from '#/database'
import Inventory from '#/database/models/inventory'
import Product from '#/database/models/product'
import ProductAttribute from '#/database/models/productAttribute'
import ProductAttributeValue from '#/database/models/productAttributeValue'
import ProductVariant from '#/database/models/productVariant'
import ProductBarcode from '#/database/models/productBarcode'
import Unit from '#/database/models/units'
import { ApiError } from '#/response'
import { assertVendorAccess, assertWarehouseAccess, TVendorScope } from '#/utils/tenant'
import { Op } from 'sequelize'

/**
 * Unified product query serving POS/Sell and Admin Product Management.
 *
 * Spec adaptation notes (actual schema vs. task SQL):
 * - Task `v.sku`      -> `productVariants.skuCode` (canonical, uppercase).
 * - Task `v.barcode`  -> `productVariants.code` (CODE128 barcode, nullable).
 * - Task `v.name`     -> variants carry no `name` column; the variant is
 *   identified by `skuCode` (+ attribute values when loaded). `display_name`
 *   is `{product.name} - {skuCode}`.
 * - Task `v.price`    -> `salePrice ?? regularPrice ?? 0`.
 * - Task `p.is_active`-> `products` has no `isActive` column (paranoid
 *   `deletedAt` marks inactive); variants filter on `isActive = true`.
 * - Task `ILIKE`      -> MySQL `LIKE` (default collation is
 *   case-insensitive, so `%q%` covers case variants).
 * - POS reads NEVER touch `getCachedEntity` (real-time inventory, no
 *   oversell); this module imports no caching helpers by design.
 */

export type ProductSearchContext = 'POS' | 'ADMIN'

export interface ProductSearchParams {
  query?: string | null
  context: string
  warehouseId?: number | string | null
  warehouse_id?: number | string | null
  vendorId?: number | string | null
  page?: number | string | null
  limit?: number | string | null
}

export interface ExactMatchItem {
  variant_id: number
  product_id: number
  product_name: string
  variant_name: string
  display_name: string
  sku: string
  barcode: string | null
  barcode_id: number | null
  price: number
  costPrice: number
  stock_quantity: number
  VAT: number | null
  imageUrl: string | null
  isNegative: boolean
  sold: number
}

export interface PosSearchItem extends ExactMatchItem {}

export interface AdminSearchItem {
  product_id: number
  product_name: string
  category_id: number | null
  is_active: boolean
  total_variants: number
  total_stock: number
  price_from: number
  price_to: number
}

export type ProductSearchResult =
  | {
      exact_match: true
      context: ProductSearchContext
      data: ExactMatchItem
      page: number
      limit: number
    }
  | {
      exact_match: false
      context: ProductSearchContext
      data: (PosSearchItem | AdminSearchItem)[]
      total_count: number
      page: number
      limit: number
    }

const effectiveBarcodePrice = (barcode: any): number => {
  const get = (k: string) => (typeof barcode?.get === 'function' ? barcode.get(k) : barcode?.[k])
  const now = Date.now()
  const promo = Number(get('promoPrice'))
  const start = get('promoStartAt') ? new Date(get('promoStartAt')).getTime() : -Infinity
  const end = get('promoEndAt') ? new Date(get('promoEndAt')).getTime() : Infinity
  if (Number.isFinite(promo) && promo >= 0 && now >= start && now <= end) return promo
  return Number(get('retailPrice') ?? 0)
}

const variantPrice = (variant: any): number => {
  const get = (k: string) => (typeof variant.get === 'function' ? variant.get(k) : variant[k])
  const barcodes = get('barcodes') ?? []
  const base = barcodes.find((row: any) => Number(row.get?.('conversionRate') ?? row.conversionRate) === 1) ?? barcodes[0]
  return effectiveBarcodePrice(base)
}

const variantStock = (variant: any): number => {
  const inventories = typeof variant.get === 'function' ? variant.get('inventories') : variant.inventories
  const list = Array.isArray(inventories) ? inventories : inventories ? [inventories] : []
  return list.reduce((sum: number, inv: any) => {
    const q = Number(typeof inv.get === 'function' ? inv.get('quantity') : inv.quantity)
    return sum + (Number.isFinite(q) ? q : 0)
  }, 0)
}

const toExactItem = (variant: any, stockQuantity: number): ExactMatchItem => {
  const get = (k: string) => (typeof variant.get === 'function' ? variant.get(k) : variant[k])
  const product = get('product') ?? variant.product ?? {}
  const productGet = (k: string) =>
    typeof product?.get === 'function' ? product.get(k) : product ? product[k] : undefined
  const sku = String(get('skuCode') ?? get('sku') ?? '')
  const productName = String(productGet('name') ?? '')
  const barcodes = get('barcodes') ?? []
  const selectedBarcode = get('matchedBarcode') ?? barcodes.find((row: any) => Number(row.get?.('conversionRate') ?? row.conversionRate) === 1) ?? barcodes[0]
  return {
    variant_id: Number(get('id')),
    product_id: Number(get('productId') ?? productGet('id')),
    product_name: productName,
    variant_name: sku,
    display_name: sku ? `${productName} - ${sku}` : productName,
    sku,
    barcode: (selectedBarcode?.get?.('barcode') ?? selectedBarcode?.barcode ?? null) as string | null,
    barcode_id: Number(selectedBarcode?.get?.('id') ?? selectedBarcode?.id ?? 0) || null,
    price: variantPrice(variant),
    costPrice: Number(selectedBarcode?.get?.('costPrice') ?? selectedBarcode?.costPrice ?? 0),
    stock_quantity: stockQuantity,
    VAT: get('VAT') == null ? null : Number(get('VAT')),
    imageUrl: get('imageUrl') ?? null,
    isNegative: Boolean(get('isNegative')),
    sold: Number(get('sold') ?? 0)
  }
}

/**
 * Execute the unified search. `vendorScope` comes from `getVendorScope(req)`.
 * Throws 400 on bad input, 403 on cross-vendor/warehouse access.
 */
export const searchProducts = async (
  params: ProductSearchParams,
  vendorScope: TVendorScope
): Promise<ProductSearchResult> => {
  const context = String(params.context ?? '')
    .trim()
    .toUpperCase() as ProductSearchContext
  if (context !== 'POS' && context !== 'ADMIN') throw ApiError.badRequest('context must be POS or ADMIN')

  const rawWarehouseId = params.warehouseId ?? params.warehouse_id
  const warehouseId = rawWarehouseId == null || String(rawWarehouseId).trim() === '' ? null : Number(rawWarehouseId)
  if (context === 'POS' && warehouseId === null) {
    throw ApiError.badRequest('warehouse_id is required when context is POS')
  }
  if (warehouseId !== null) {
    if (!Number.isSafeInteger(warehouseId) || warehouseId < 1) throw ApiError.badRequest('Invalid warehouse_id')
    await assertWarehouseAccess(warehouseId, vendorScope)
  }

  const page = Math.max(1, Number(params.page ?? 1) || 1)
  const limit = Math.min(200, Math.max(1, Number(params.limit ?? 20) || 20))
  const offset = (page - 1) * limit

  const rawVendorId = params.vendorId
  let productVendorWhere: Record<string, unknown>
  if (rawVendorId !== undefined && rawVendorId !== null && String(rawVendorId).trim() !== '') {
    assertVendorAccess(vendorScope, Number(rawVendorId), 'Unauthorized vendor filter')
    productVendorWhere = { vendorId: Number(rawVendorId) }
  } else if (vendorScope === null) {
    productVendorWhere = {}
  } else {
    productVendorWhere = { vendorId: { [Op.in]: vendorScope } }
  }

  const query = String(params.query ?? '').trim()
  const hasQuery = query !== ''
  const queryUpper = query.toUpperCase()

  /* ---------------- Branch 1: exact scan match (barcode or SKU) -------- */
  if (hasQuery) {
    const exact = await tryExactMatch(query, queryUpper, productVendorWhere)
    if (exact) {
      const stockQuantity = await resolveExactStock(Number(exact.get('id')), warehouseId)
      return { exact_match: true, context, data: toExactItem(exact, stockQuantity), page, limit }
    }
  }

  /* ---------------- Branch 2: context fallback ------------------------- */
  if (context === 'POS') {
    return await searchPos({ query, hasQuery, warehouseId, productVendorWhere, limit, offset, page })
  }
  return await searchAdmin({ query, hasQuery, warehouseId, productVendorWhere, limit, offset, page })
}

/** Exact lookup on product_barcodes (or a SKU), active variants only. */
const tryExactMatch = async (
  query: string,
  queryUpper: string,
  productVendorWhere: Record<string, unknown>
): Promise<any | null> => {
  const matchedBarcode: any = await ProductBarcode.findOne({ where: { barcode: query } })
  if (matchedBarcode) {
    const variant: any = await (ProductVariant as any).findOne({
      where: { id: Number(matchedBarcode.get('variantId')), isActive: true },
      include: [
        { model: ProductBarcode, as: 'barcodes', required: false, include: [{ model: Unit, as: 'unit' }] },
        { model: Product, required: true, where: { ...productVendorWhere }, attributes: ['id', 'name', 'vendorId'] }
      ]
    })
    if (variant) variant.setDataValue('matchedBarcode', matchedBarcode)
    return variant
  }
  const or: Record<string, unknown>[] = [{ skuCode: query }]
  if (queryUpper !== query) or.push({ skuCode: queryUpper })
  return (ProductVariant as any).findOne({
    where: { isActive: true, [Op.or]: or },
    include: [
      { model: ProductBarcode, as: 'barcodes', required: false, include: [{ model: Unit, as: 'unit' }] },
      {
        model: Product,
        required: true,
        where: { ...productVendorWhere },
        attributes: ['id', 'name', 'vendorId']
      }
    ]
  }).then((variant: any) => variant)
}

/** Stock for an exact hit: single-warehouse level, or summed across warehouses for Admin. */
const resolveExactStock = async (variantId: number, warehouseId: number | null): Promise<number> => {
  if (warehouseId !== null) {
    const row: any = await (Inventory as any).findOne({ where: { variantId, warehouseId } })
    const q = Number(row?.get ? row.get('quantity') : (row?.quantity ?? 0))
    return Number.isFinite(q) ? q : 0
  }
  const rows: any[] = await (Inventory as any).findAll({ where: { variantId } })
  return rows.reduce((sum, inv) => {
    const q = Number(inv?.get ? inv.get('quantity') : (inv?.quantity ?? 0))
    return sum + (Number.isFinite(q) ? q : 0)
  }, 0)
}

interface FallbackArgs {
  query: string
  hasQuery: boolean
  warehouseId: number | null
  productVendorWhere: Record<string, unknown>
  limit: number
  offset: number
  page: number
}

/** Case A: POS variant-level search for fast checkout (never cached). */
const searchPos = async (args: FallbackArgs): Promise<Extract<ProductSearchResult, { exact_match: false }>> => {
  const { query, hasQuery, warehouseId, productVendorWhere, limit, offset, page } = args
  const like = `%${query}%`

  const variantWhere: Record<string, unknown> = { isActive: true }
  if (hasQuery) {
    ;(variantWhere as any)[Op.or] = [
      { skuCode: { [Op.like]: like } },
      { '$barcodes.barcode$': { [Op.like]: like } },
      // `$product.name$` reaches into the joined product row.
      { '$product.name$': { [Op.like]: like } }
    ]
  }

  const inventoryInclude: any = {
    model: Inventory,
    required: false,
    attributes: ['id', 'warehouseId', 'quantity', 'variantId']
  }
  if (warehouseId !== null) inventoryInclude.where = { warehouseId }

  const { rows, count } = await (ProductVariant as any).findAndCountAll({
    where: variantWhere,
    include: [
      { model: ProductBarcode, as: 'barcodes', required: false, include: [{ model: Unit, as: 'unit' }] },
      { model: Product, as: 'product', required: true, where: { ...productVendorWhere }, attributes: ['id', 'name'] },
      {
        model: ProductAttributeValue,
        as: 'attributeValues',
        required: false,
        attributes: ['id', 'value', 'attributeId'],
        through: { attributes: [] },
        include: [{ model: ProductAttribute, attributes: ['id', 'name'] }]
      },
      inventoryInclude
    ],
    // order: [[{ model: Product, as: 'product' }, 'name', 'ASC']],
    limit,
    offset,
    distinct: true
  })

  const data: PosSearchItem[] = (rows as any[]).map((variant) => {
    const item = toExactItem(variant, variantStock(variant))
    return item
  })
  return { exact_match: false, context: 'POS', data, total_count: Number(count ?? 0), page, limit }
}

/** Case B: Admin product-level search with aggregated stock. */
const searchAdmin = async (args: FallbackArgs): Promise<Extract<ProductSearchResult, { exact_match: false }>> => {
  const { query, hasQuery, warehouseId, productVendorWhere, limit, offset, page } = args
  const like = `%${query}%`

  // Variants matching the free text pull their parent products into the result.
  let variantMatchedProductIds: number[] = []
  if (hasQuery) {
    const matched: any[] = await (ProductVariant as any).findAll({
      where: { skuCode: { [Op.like]: like } },
      attributes: ['productId'],
      raw: true
    })
    variantMatchedProductIds = [...new Set(matched.map((v: any) => Number(v.productId)).filter(Boolean))]
  }

  const where: Record<string, unknown> = { ...productVendorWhere }
  if (hasQuery) {
    ;(where as any)[Op.or] = [
      { name: { [Op.like]: like } },
      ...(variantMatchedProductIds.length ? [{ id: { [Op.in]: variantMatchedProductIds } }] : [])
    ]
  }

  const stockLiteral =
    warehouseId !== null
      ? `SELECT COALESCE(SUM(quantity), 0) FROM inventories WHERE inventories.productId = product.id AND inventories.warehouseId = ${Number(warehouseId)}`
      : `SELECT COALESCE(SUM(quantity), 0) FROM inventories WHERE inventories.productId = product.id`

  const { rows, count } = await (Product as any).findAndCountAll({
    where,
    include: [
      {
        model: ProductVariant,
        as: 'variants',
        required: false,
        attributes: ['id', 'skuCode', 'isActive'],
        include: [{ model: ProductBarcode, as: 'barcodes', required: false, include: [{ model: Unit, as: 'unit' }] }]
      }
    ],
    attributes: {
      include: [
        [
          database.sequelize.literal(
            `(SELECT COUNT(*) FROM productVariants AS variants WHERE variants.productId = product.id AND variants.deletedAt IS NULL)`
          ),
          'variantCount'
        ],
        [database.sequelize.literal(`(${stockLiteral})`), 'quantity']
      ]
    },
    order: [['id', 'DESC']],
    limit,
    offset,
    distinct: true
  })

  const data: AdminSearchItem[] = (rows as any[]).map((product: any) => {
    const get = (k: string) => (typeof product.get === 'function' ? product.get(k) : product[k])
    const categories = get('categories') as any[] | undefined
    const firstCategory = Array.isArray(categories) && categories.length ? categories[0] : null
    const categoryId = firstCategory
      ? Number(typeof firstCategory.get === 'function' ? firstCategory.get('id') : firstCategory.id)
      : null
    const isActive = get('isActive')
    const variants = (get('variants') as any[] | undefined)?.filter((variant) => {
      const variantGet = (key: string) => (typeof variant.get === 'function' ? variant.get(key) : variant[key])
      return variantGet('isActive') !== false
    }) ?? []
    const prices = variants.map(variantPrice)
    return {
      product_id: Number(get('id')),
      product_name: String(get('name') ?? ''),
      category_id: Number.isFinite(categoryId) ? categoryId : null,
      is_active: isActive === undefined || isActive === null ? true : Boolean(isActive),
      total_variants: Number(get('variantCount') ?? get('total_variants') ?? 0) || 0,
      total_stock: Number(get('quantity') ?? get('total_stock') ?? 0) || 0,
      price_from: prices.length ? Math.min(...prices) : 0,
      price_to: prices.length ? Math.max(...prices) : 0
    }
  })

  return { exact_match: false, context: 'ADMIN', data, total_count: Number(count ?? 0), page, limit }
}
