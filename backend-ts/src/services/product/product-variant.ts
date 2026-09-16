import ProductAttribute from '#/database/models/productAttribute'
import ProductAttributeValue from '#/database/models/productAttributeValue'
import ProductVariant from '#/database/models/productVariant'
import { buildVariantSkuWithTemplate } from '#/utils/variant'
import { Transaction } from 'sequelize'
import { SettingService } from '../setting'
import { resolveVariantCode, toPrice } from './helper'
import { adjustStock, createOpeningStock } from './product-stock'
import { VariantInput } from './product.types'

const extractValueIds = (variant: VariantInput): number[] =>
  Array.isArray(variant.attributeValues)
    ? variant.attributeValues.map((x) => Number(x)).filter((n) => Number.isFinite(n))
    : []

/** Load attribute values by id and verify every one belongs to `vendorId`. */
const loadAndVerifyAttributeValues = async (valIds: number[], vendorId: number, transaction?: Transaction) => {
  if (!valIds.length) return []
  const values: any[] = await ProductAttributeValue.findAll({
    where: { id: valIds },
    include: [{ model: ProductAttribute, attributes: ['id', 'vendorId'] }],
    transaction
  })
  if (values.length !== valIds.length) throw new Error('Invalid attributeValues')
  for (const val of values) {
    const attributeVendorId = val.attribute?.vendorId ?? val.productAttribute?.vendorId
    if (Number(attributeVendorId) !== Number(vendorId)) throw new Error('Attribute value vendor mismatch')
  }
  return values
}

export interface CreateVariantsContext {
  productId: number
  vendorId: number
  warehouseId: number
  baseSku: string
  baseCode: string | null
  skuTemplate: string | undefined
  transaction?: Transaction
}

/**
 * Create all variant rows (+ their opening stock) for a brand-new
 * `PRODUCT_TYPE.VARIANT` product. Used by `ProductService.create`.
 */
export const createVariants = async (variants: VariantInput[], ctx: CreateVariantsContext) => {
  const { productId, vendorId, warehouseId, baseSku, baseCode, skuTemplate, transaction } = ctx
  const takenSkus = new Set<string>([baseSku])
  const takenCodes = new Set<string>([String(baseCode ?? '').trim()].filter(Boolean))
  const created: any[] = []

  for (const variant of variants) {
    const valIds = extractValueIds(variant)
    const attributeValues = await loadAndVerifyAttributeValues(valIds, vendorId, transaction)

    let skuCode = variant.skuCode ? String(variant.skuCode).trim() : ''
    if (!skuCode) {
      const optMap: Record<string, string> = {}
      for (const val of attributeValues as any[]) optMap[String(val.attributeId)] = String(val.value)
      skuCode = buildVariantSkuWithTemplate(skuTemplate, baseSku, optMap as any, takenSkus)
    }
    takenSkus.add(skuCode)

    const codeSegments = attributeValues.map((val: any) => String(val.value ?? ''))
    const code = resolveVariantCode(baseCode, variant.code, codeSegments, takenCodes)

    const variantRow: any = await ProductVariant.create(
      {
        productId,
        code,
        skuCode,
        salePrice: toPrice(variant.salePrice, 'salePrice'),
        regularPrice: toPrice(variant.regularPrice, 'regularPrice'),
        wholeSalePrice: toPrice(variant.wholeSalePrice, 'wholeSalePrice'),
        costPrice: toPrice(variant.costPrice, 'costPrice'),
        isNegative: Boolean(variant.isNegative),
        isActive: variant.isActive !== undefined ? Boolean(variant.isActive) : true
      },
      { transaction }
    )

    if (valIds.length) await variantRow.$set('attributeValues', valIds, { transaction })

    const quantity = Number(variant.quantity ?? 0)
    const stock = await createOpeningStock({ productId, variantId: variantRow.id, warehouseId, quantity, transaction })
    created.push(stock ? { ...variantRow.dataValues, inventory: stock.inventory.dataValues } : variantRow.dataValues)
  }

  return created
}

/** id/name lookup tables for a vendor's attribute values, used to resolve variant payloads. */
const buildValueLookups = (values: any[]) => {
  const byId = new Map<number, any>(values.map((v) => [Number(v.id), v]))
  const byName = new Map<string, any>()
  for (const v of values) {
    const attrName = v.attribute?.name ?? v.productAttribute?.name ?? ''
    byName.set(`${String(attrName).trim().toLowerCase()}::${String(v.value).trim().toLowerCase()}`, v)
  }
  return { byId, byName }
}

/** Resolve a variant payload's attributeValue ids, from either raw ids or a `{attrName: value}` map. */
const resolveValueIds = (variant: VariantInput, byName: Map<string, any>): number[] => {
  const raw = extractValueIds(variant)
  if (raw.length) return raw

  const opts: Record<string, string> = variant.optionValues || variant.options || {}
  const ids = Object.entries(opts)
    .map(([name, value]) => byName.get(`${String(name).trim().toLowerCase()}::${String(value).trim().toLowerCase()}`))
    .filter(Boolean)
    .map((row: any) => Number(row.id))
  return [...new Set(ids)]
}

const buildVariantFields = (v: VariantInput) => ({
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
})

/**
 * Shared variant upsert/delete core used by `ProductService.updateProduct`.
 * Handles per-variant barcode (`code`): manual value wins, blank clears to
 * null, missing auto-extends `{productCode}-{segments}` when possible.
 */
export const applyVariantSync = async (
  product: any,
  vendorId: number,
  variants: VariantInput[],
  removedVariantIds: (number | string)[],
  warehouseId: number | null,
  transaction?: Transaction
): Promise<void> => {
  const productId = Number(product.id ?? product.get?.('id'))

  for (const rawId of removedVariantIds || []) {
    const variant = await ProductVariant.findByPk(Number(rawId), { transaction })
    if (!variant) continue
    if (Number(variant.productId ?? variant.get?.('productId')) !== productId) continue
    // Paranoid soft-delete: keep inventory/order history, hide variant from sales.
    await variant.destroy({ transaction })
  }

  const currentVariants: any[] = await ProductVariant.findAll({
    where: { productId },
    include: [{ model: ProductAttributeValue, as: 'attributeValues', through: { attributes: [] } }],
    transaction
  })
  // Include soft-deleted SKUs/codes so auto-generation never violates the
  // DB unique [productId, skuCode] occupied by a paranoid-deleted row.
  const deletedVariants: any[] = (
    await ProductVariant.findAll({
      where: { productId },
      paranoid: false,
      attributes: ['skuCode', 'code', 'deletedAt'],
      transaction
    })
  ).filter((r: any) => r.get?.('deletedAt'))

  const productCode = product.code ?? product.get?.('code') ?? null
  const baseSku = product.skuCode || product.code || String(productId)

  let skuTemplate: string | undefined
  try {
    const settings = await new SettingService().getForVendor(vendorId)
    skuTemplate = settings?.skuTemplate ?? undefined
  } catch (e) {
    console.warn('settings not available for variant sku generation', e)
  }

  const takenSkus = new Set<string>([
    baseSku,
    ...currentVariants.map((v) => v.get('skuCode')),
    ...deletedVariants.map((v) => v.get('skuCode'))
  ])
  const takenCodes = new Set<string>(
    [...currentVariants, ...deletedVariants].map((v) => String(v.get('code') ?? '').trim()).filter(Boolean)
  )
  if (productCode) takenCodes.add(String(productCode).trim())

  const vendorAttrs: any[] = await ProductAttribute.findAll({ where: { vendorId }, transaction })
  const allValues: any[] = vendorAttrs.length
    ? await ProductAttributeValue.findAll({
        where: { attributeId: vendorAttrs.map((a) => a.id) },
        include: [{ model: ProductAttribute, attributes: ['id', 'name', 'vendorId'] }],
        transaction
      })
    : []
  const { byId: valueById, byName: valueByName } = buildValueLookups(allValues)

  const findExistingVariant = async (v: VariantInput, valIds: number[]) => {
    const variantId = v.id ?? v.variantId
    if (variantId) return ProductVariant.findByPk(Number(variantId), { transaction })
    if (!valIds.length) return null
    const key = [...valIds].sort((a, b) => a - b).join(',')
    return (
      currentVariants.find((cv) => {
        const ids = ((cv.get('attributeValues') || []) as any[])
          .map((av) => Number(av.id))
          .sort((a, b) => a - b)
          .join(',')
        return ids === key
      }) ?? null
    )
  }

  for (const v of variants || []) {
    const valIds = resolveValueIds(v, valueByName)
    if (!valIds.length) continue

    for (const vid of valIds) {
      const row = valueById.get(Number(vid))
      if (!row) throw new Error(`Invalid attributeValue ${vid}`)
      if (Number(row.attribute?.vendorId ?? row.productAttribute?.vendorId) !== vendorId)
        throw new Error('Attribute value vendor mismatch')
    }

    const valuesForCode = valIds.map((id) => valueById.get(id)).filter(Boolean)
    const codeSegments = valuesForCode.map((val: any) => String(val.value ?? ''))
    const fields: Record<string, unknown> = buildVariantFields(v)
    const existing: any = await findExistingVariant(v, valIds)

    if (existing) {
      if (Number(existing.productId ?? existing.get?.('productId')) !== productId)
        throw new Error('Variant does not belong to product')
      if (!fields.skuCode) delete fields.skuCode
      if (v.code !== undefined) {
        const nextCode = resolveVariantCode(productCode, v.code, codeSegments, takenCodes, { allowBlankUpdate: false })
        if (nextCode !== undefined) fields.code = nextCode
      }
      await existing.update(fields, { transaction })
      if (valIds.length) await existing.$set('attributeValues', valIds, { transaction })
      if (v.quantity !== undefined && v.quantity !== null && v.quantity !== '' && warehouseId) {
        await adjustStock({
          productId,
          variantId: existing.get('id'),
          warehouseId,
          target: Number(v.quantity),
          transaction
        })
      }
      continue
    }

    let skuCode = fields.skuCode as string | undefined
    if (!skuCode) {
      const optMap: Record<string, string> = {}
      for (const val of valuesForCode as any[]) optMap[String(val.attributeId)] = String(val.value)
      skuCode = buildVariantSkuWithTemplate(skuTemplate, baseSku, optMap as any, takenSkus)
    }
    takenSkus.add(skuCode as string)

    const code = resolveVariantCode(productCode, v.code, codeSegments, takenCodes)
    const variantRow: any = await ProductVariant.build({ productId, code, skuCode, ...fields }).save({ transaction })
    if (valIds.length) await variantRow.$set('attributeValues', valIds, { transaction })

    const quantity = Number(v.quantity ?? 0)
    if (quantity && warehouseId) {
      await createOpeningStock({ productId, variantId: variantRow.get('id'), warehouseId, quantity, transaction })
    }
  }
}
