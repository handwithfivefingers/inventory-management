import database from '#/database'
import Category from '#/database/models/category'
import Inventory from '#/database/models/inventory'
import Product from '#/database/models/product'
import ProductAttribute from '#/database/models/productAttribute'
import ProductAttributeValue from '#/database/models/productAttributeValue'
import ProductVariant from '#/database/models/productVariant'
import Tag from '#/database/models/tag'
import Transfer from '#/database/models/transfer'
import Unit from '#/database/models/units'
import { IRequestLocal } from '#/types/common'
import { applyCodeFormat, generateSkuFromTemplate, getCodeFormat, padSeq } from '#/utils/code-generator'
import { nextSequence } from '#/utils/sequence'
import { assertVendorAccess, assertWarehouseAccess, getVendorScope } from '#/utils/tenant'
import { buildAttributeCombinations, buildVariantSkuWithTemplate, findOverride } from '#/utils/variant'
import { Op, Sequelize } from 'sequelize'
import { SettingService } from '../setting'
import { ApiError } from '#/response'
import { getPagination } from '#/utils'

// const InventoryService = require('../inventory')
// const BaseCRUDService = require('@constant/base')
// const TransferService = require('../transfer')
// const { Op } = require('sequelize')
// const { cacheGet, cacheKey, cacheSet, cacheDel } = require('@src/libs/redis')
// const { productCacheItem, productCacheList, CACHE_KEY } = require('./cache')
// const fs = require('fs')
// const XLSX = require('xlsx')

export class ProductService {
  sequelize: Sequelize = database.sequelize
  async create(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const {
        warehouseId,
        quantity,
        categories,
        tags,
        attributes,
        variants: variantOverrides,
        generateAll,
        ...params
      } = req.body
      // Validate required fields
      if (!warehouseId) throw new Error('warehouseId is required')
      // S1: the warehouse must belong to one of the caller's vendors.
      await assertWarehouseAccess(warehouseId, getVendorScope(req))
      // The top-level quantity is only used by simple products; variable
      // products carry stock per variant instead.
      const hasVariantAttributes = Array.isArray(attributes) && attributes.length > 0
      if (!hasVariantAttributes && (!quantity || isNaN(quantity))) throw new Error('Invalid quantity')
      // Product code is optional: it is auto-generated from vendor
      // prefix/suffix settings below when not provided.
      // Resolve vendor settings to auto-generate code/skuCode when missing
      const scope = getVendorScope(req)
      const finalVendorId = params.vendorId || (req as any)?.user?.vendorId || scope?.[0]
      if (params.vendorId != null) {
        assertVendorAccess(scope, Number(params.vendorId), 'Unauthorized to create products for this vendor')
      }
      let settings: any = null
      try {
        settings = await new SettingService().getForVendor(finalVendorId)
      } catch (e) {
        console.warn('settings not available for product code generation', e)
      }

      // C1: atomic per-scope counter instead of count()+1, which produced
      // duplicate codes under concurrent creations. The counter lives in the
      // `sequences` table and is incremented atomically; the unique index on
      // products.code remains the final safety net.
      let seq: number | null = null
      if (settings && (!params.code || !params.skuCode)) {
        seq = await nextSequence('product', new Date().getFullYear(), {
          transaction: t,
          initial: (await (database as any).product.count()) + 1
        })
      }
      if (!params.code && settings && seq != null) {
        const { prefix, suffix } = getCodeFormat(settings.codePrefix, settings.codeSuffix, 'product')
        params.code = applyCodeFormat(padSeq(seq), prefix, suffix)
      }
      if (!params.skuCode && settings && seq != null) {
        const baseCode = params.code || padSeq(seq)
        params.skuCode = generateSkuFromTemplate(
          settings.skuTemplate,
          {
            CODE: baseCode,
            SEQ: padSeq(seq),
            YYYY: String(new Date().getFullYear())
          },
          baseCode
        )
      }

      // Check for existing product
      const existing = await (database as any).product.findOne({
        where: { code: params.code }
      })

      if (existing) throw new Error(`Product with code ${params.code} already exists`)

      // const newProduct = await this.createInstance(params, {
      //   transaction: t,
      //   include: [this.db.category, this.db.tag, this.db.unit]
      // })
      const _prod = await (database as any).product.build(params)
      await _prod.save({ transaction: t })
      if (categories) {
        // await _prod.setCategories(categories, { transaction: t })
        await _prod.$set('categories', categories, { transaction: t })
      }
      if (tags) {
        // await _prod.setTags(tags, { transaction: t })
        await _prod.$set('tags', tags, { transaction: t })
      }
      // const inventoryInstance = await new InventoryService().createInstance(
      //   {
      //     warehouseId: warehouse.id,
      //     quantity,
      //     productId: newProduct.id
      //   },
      //   {
      //     transaction: t
      //   }
      // )
      const hasVariants = hasVariantAttributes
      const createdVariants: any[] = []
      let _invData: any = null
      let _transData: any = null

      if (hasVariants) {
        // Attribute-based product: persist the option matrix, then one variant
        // row per attribute-value combination (WooCommerce style).
        const valueKeyToId = new Map<string, number>()
        for (const attr of attributes) {
          if (!attr?.name) continue
          const attrRow = await ProductAttribute.build({ name: attr.name, productId: _prod.id }).save({
            transaction: t
          })
          for (const value of attr.values || []) {
            if (value == null || value === '') continue
            const valRow = await ProductAttributeValue.build({
              value,
              attributeId: attrRow.id,
              productId: _prod.id
            }).save({ transaction: t })
            valueKeyToId.set(`${attr.name}::${value}`, valRow.id)
          }
        }

        const combos = buildAttributeCombinations(attributes)
        // Manual mode: only the combinations the caller explicitly listed in
        // `variants` become rows; generate-all (default) keeps every combo.
        const manualSelection = generateAll === false
        const selectedCombos = manualSelection
          ? combos.filter((options) => !!findOverride(variantOverrides, options))
          : combos
        const baseSku = params.skuCode || params.code || String(_prod.id)
        const takenSkus = new Set<string>([baseSku])

        for (const options of selectedCombos) {
          const override: any = findOverride(variantOverrides, options)
          // Variant SKUs follow the vendor SKU template, then get the
          // attribute segments appended (e.g. "SP00001-DO", "SP00001-TRANG").
          const skuCode =
            override?.skuCode || buildVariantSkuWithTemplate(settings?.skuTemplate, baseSku, options, takenSkus)
          takenSkus.add(skuCode)

          const variantRow = await (database as any).productVariant
            .build({
              productId: _prod.id,
              skuCode,
              salePrice: override?.salePrice ?? null,
              regularPrice: override?.regularPrice ?? null,
              wholeSalePrice: override?.wholeSalePrice ?? null,
              costPrice: override?.costPrice ?? null,
              isNegative: Boolean(override?.isNegative) || false
            })
            .save({ transaction: t })

          const valueIds = Object.keys(options)
            .map((name) => valueKeyToId.get(`${name}::${options[name]}`))
            .filter(Boolean)
          // await variantRow.setAttributeValues(valueIds as number[], { transaction: t })
          await variantRow.$set('attributeValues', valueIds as number[], { transaction: t })
          // Opening stock per variant (defaults to 0 when not provided)
          const variantQuantity = Number(override?.quantity ?? 0)
          let inventoryRow: any = null
          if (variantQuantity !== 0) {
            inventoryRow = await (database as any).inventory
              .build({
                warehouseId,
                quantity: variantQuantity,
                productId: _prod.id,
                variantId: variantRow.id
              })
              .save({ transaction: t })
            await (database as any).transfer
              .build({
                fromWarehouseId: warehouseId,
                quantity: variantQuantity,
                productId: _prod.id,
                variantId: variantRow.id,
                type: '0'
              })
              .save({ transaction: t })
          }

          createdVariants.push({
            ...variantRow.dataValues,
            inventory: inventoryRow ? inventoryRow.dataValues : null
          })
        }
      } else {
        // Simple product: single product-level stock row + opening IN transfer
        const _inv = Inventory.build({
          warehouseId,
          quantity,
          productId: _prod.id
        })

        const _trans = Transfer.build({
          fromWarehouseId: warehouseId,
          productId: _prod.id,
          quantity,
          type: '0'
        })

        await _inv.save({ transaction: t })
        await _trans.save({ transaction: t })
        _invData = _inv.dataValues
        _transData = _trans.dataValues
      }

      await t.commit()
      return {
        ...(hasVariants ? {} : { inventory: _invData, transfer: _transData }),
        product: _prod.dataValues,
        ...(hasVariants ? { variants: createdVariants } : {})
      }
    } catch (error) {
      await t.rollback()
      throw new Error(`Product creation failed: ${error}`)
    }
  }

  async getProducts(req: IRequestLocal) {
    try {
      const { s } = req.query as any
      const rawVendorId = (req.query as any)?.vendorId
      const scope = getVendorScope(req)
      const { offset, limit } = getPagination(req.query)
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
        // include: [
        //   {
        //     model: Inventory,
        //     attributes: []
        //   }
        // ],
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
        distinct: true
      }
      if (s) {
        queryParams.where = {
          // @ts-ignore
          [Op.or]: {
            name: {
              [Op.startsWith]: s
            },
            code: {
              [Op.startsWith]: s
            },
            skuCode: {
              [Op.startsWith]: s
            }
          },
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
            model: ProductAttribute,
            as: 'attributes',
            attributes: ['id', 'name'],
            include: [
              {
                model: ProductAttributeValue,
                as: 'values',
                attributes: ['id', 'value']
              }
            ]
          },
          {
            model: ProductVariant,
            as: 'variants',
            include: [
              {
                model: ProductAttributeValue,
                as: 'attributeValues',
                attributes: ['id', 'value'],
                through: { attributes: [] },
                // Attribute names let the client map each value back to its option
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
   * List attribute definitions scoped to a vendor (Global Vendor).
   * GET /products/attributes?vendorId=1  -> only attributes whose product belongs to that vendor.
   * Without vendorId, falls back to the caller's vendor scope (never returns all-system).
   */
  async listAttributes(req: IRequestLocal) {
    try {
      const rawVendorId = (req.query as any)?.vendorId
      const vendorId = rawVendorId != null && String(rawVendorId).trim() !== '' ? Number(rawVendorId) : null
      const scope = getVendorScope(req)
      // Build Product include with vendor filter: prefer explicit vendorId, otherwise scope
      const productInclude: any = {
        model: Product,
        attributes: ['id', 'name', 'skuCode', 'vendorId']
      }
      if (vendorId != null && Number.isFinite(vendorId)) {
        assertVendorAccess(scope, vendorId, 'Unauthorized to list attributes for this vendor')
        productInclude.where = { vendorId }
        productInclude.required = true
      } else if (scope && scope.length > 0) {
        // No explicit vendorId -> restrict to caller's vendors to avoid system-wide leak
        productInclude.where = { vendorId: { [Op.in]: scope } }
        productInclude.required = true
      }
      const rows = await ProductAttribute.findAll({
        include: [{ model: ProductAttributeValue, as: 'values' }, productInclude],
        order: [['id', 'ASC']]
      })
      // Deduplicate per vendor: Attribute Name unique per vendor, Value unique per attribute (vendor)
      // Multiple products may each have "Size" -> merge into one vendor-global attribute with consolidated values
      const byName = new Map<string, any>()
      for (const row of rows as any[]) {
        const nameRaw = String(row.get('name') ?? row.name ?? '').trim()
        if (!nameRaw) continue
        const key = nameRaw.toLowerCase()
        const vals: any[] = (row.get('values') ?? row.values ?? []) as any[]
        if (!byName.has(key)) {
          byName.set(key, {
            id: row.get('id') ?? row.id,
            name: nameRaw,
            // keep minimal shape expected by client
            values: vals.map((v: any) => ({ id: v.get('id') ?? v.id, value: String(v.get('value') ?? v.value) })),
            // keep product refs for debugging (first product)
            product: row.get('product') ?? (row as any).product,
            productId: row.get('productId') ?? (row as any).productId
          })
        } else {
          const existing = byName.get(key)
          const existingVals = existing.values as any[]
          const seen = new Set(existingVals.map((v: any) => String(v.value).toLowerCase()))
          for (const v of vals) {
            const valStr = String(v.get('value') ?? v.value).trim()
            if (!valStr) continue
            const lower = valStr.toLowerCase()
            if (!seen.has(lower)) {
              seen.add(lower)
              existingVals.push({ id: v.get('id') ?? v.id, value: valStr })
            }
          }
          // keep smallest id for stable key
          const rowId = row.get('id') ?? row.id
          if (rowId < existing.id) existing.id = rowId
        }
      }
      return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /**
   * Update a single variant (SKU/prices/status/isNegative/quantity).
   * PUT /products/:id/variants/:variantId
   * `quantity` requires `warehouseId` and adjusts the variant's inventory row
   * through a corrective transfer so the movement stays auditable.
   */
  async updateVariant(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const productId = Number((req.params as any).id)
      const scope = getVendorScope(req)
      if (productId) {
        const product: any = await (database as any).product.findByPk(productId, { transaction: t })
        if (!product) throw new Error(`Product ${productId} not found`)
        assertVendorAccess(
          scope,
          Number(product.vendorId ?? product.get?.('vendorId')),
          'Unauthorized to update this product'
        )
      }
      const { variantId } = req.params
      const allowed = ['skuCode', 'salePrice', 'regularPrice', 'wholeSalePrice', 'costPrice', 'isActive', 'isNegative']
      const variant: any = await (database as any).productVariant.findByPk(variantId, { transaction: t })
      if (!variant) throw new Error(`Variant ${variantId} not found`)
      // Ensure variant belongs to the product if productId was supplied
      if (productId && Number(variant.productId ?? variant.get?.('productId')) !== productId) {
        const err = new Error('Variant does not belong to this product') as Error & { status?: number }
        err.status = 403
        throw err
      }

      const data: Record<string, unknown> = {}
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key]
      }
      await variant.update(data, { transaction: t })

      // Opening-stock style quantity correction
      if (req.body.quantity !== undefined && Number.isFinite(Number(req.body.quantity))) {
        const warehouseId = Number(req.body.warehouseId ?? req.query.warehouseId)
        if (!warehouseId) {
          throw new Error('warehouseId is required to update variant quantity')
        }
        await this.adjustVariantStock(variant, Number(req.body.quantity), warehouseId, t)
      }

      await t.commit()
      return variant
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /**
   * Delete one variant and its inventory rows.
   * DELETE /products/:id/variants/:variantId
   */
  async deleteVariant(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const productId = Number((req.params as any).id)
      const scope = getVendorScope(req)
      if (productId) {
        const product: any = await (database as any).product.findByPk(productId, { transaction: t })
        if (!product) throw new Error(`Product ${productId} not found`)
        assertVendorAccess(
          scope,
          Number(product.vendorId ?? product.get?.('vendorId')),
          'Unauthorized to delete this product'
        )
      }
      const { variantId } = req.params
      const variant: any = await (database as any).productVariant.findByPk(variantId, { transaction: t })
      if (!variant) throw new Error(`Variant ${variantId} not found`)
      if (productId && Number(variant.productId ?? variant.get?.('productId')) !== productId) {
        const err = new Error('Variant does not belong to this product') as Error & { status?: number }
        err.status = 403
        throw err
      }
      await (database as any).inventory.destroy({ where: { variantId: variant.id }, transaction: t })
      await variant.destroy({ transaction: t })
      await t.commit()
      return true
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /**
   * List all attributes (+values) of a product.
   * GET /products/:id/attributes
   */
  async getProductAttributes(req: IRequestLocal) {
    try {
      const productId = Number(req.params.id)
      if (!productId) throw new Error('product id is required')
      const scope = getVendorScope(req)
      const product: any = await (database as any).product.findByPk(productId)
      if (!product) throw new Error(`Product ${productId} not found`)
      assertVendorAccess(
        scope,
        Number(product.vendorId ?? product.get?.('vendorId')),
        'Unauthorized to view this product'
      )
      return await database.productAttribute.findAll({
        where: { productId },
        include: [{ model: database.productAttributeValue, as: 'values' }],
        order: [['id', 'ASC']]
      })
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /**
   * Create an attribute for a product and backfill any missing variant
   * combinations the new values introduce. POST /products/:id/attributes
   * body: { name: 'Color', values: ['Red', 'Blue'] }
   */
  async createAttribute(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const productId = Number(req.params.id)
      const { name, values } = req.body || {}
      if (!productId) throw new Error('product id is required')
      if (!name || !String(name).trim()) throw new Error('attribute name is required')

      const product: any = await (database as any).product.findByPk(productId, { transaction: t })
      if (!product) throw new Error(`Product ${productId} not found`)
      assertVendorAccess(
        getVendorScope(req),
        Number(product.vendorId ?? product.get?.('vendorId')),
        'Unauthorized to update this product'
      )

      await this.syncAttribute(productId, null, String(name).trim(), values || [], t)

      // Generate variants for combinations that don't exist yet
      const created = await this.backfillVariants(productId, product, t)
      await t.commit()
      return { createdVariants: created.length }
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /**
   * Rename an attribute and/or replace its value list.
   * PUT /products/:id/attributes/:attributeId
   * body: { name?: string, values?: string[] }
   */
  async updateAttribute(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const productId = Number(req.params.id)
      const attributeId = Number(req.params.attributeId)
      const { name, values } = req.body || {}
      if (!attributeId) throw new Error('attribute id is required')
      const scope = getVendorScope(req)
      const product: any = await (database as any).product.findByPk(productId, { transaction: t })
      if (!product) throw new Error(`Product ${productId} not found`)
      assertVendorAccess(
        scope,
        Number((product as any).vendorId ?? product.get?.('vendorId')),
        'Unauthorized to update this product'
      )
      const attribute = await database.productAttribute.findByPk(attributeId, { transaction: t })
      if (!attribute) throw new Error(`Attribute ${attributeId} not found`)

      if (name !== undefined && String(name).trim()) {
        await attribute.update({ name: String(name).trim() }, { transaction: t })
      }

      let removedValueIds: number[] = []
      if (Array.isArray(values)) {
        // Drop values that are no longer listed (and their variants)
        const existingValues = await database.productAttributeValue.findAll({
          where: { attributeId },
          transaction: t
        })
        const wanted = values.map((v: string) => String(v).trim()).filter(Boolean)
        removedValueIds = existingValues
          .filter((v: any) => !wanted.includes(v.get('value')))
          .map((v: any) => v.get('id'))
        if (removedValueIds.length > 0) {
          await this.deleteVariantsByValueIds(productId, removedValueIds, t)
          await database.productAttributeValue.destroy({
            where: { id: removedValueIds },
            transaction: t
          })
        }
        await this.syncAttribute(productId, attributeId, attribute.get('name'), values, t)
      }

      await this.backfillVariants(productId, product as any, t)
      await t.commit()
      return { removedValues: removedValueIds.length }
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /**
   * Delete an attribute, its values and every variant that used them.
   * DELETE /products/:id/attributes/:attributeId
   */
  async deleteAttribute(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const productId = Number((req.params as any).id)
      const scope = getVendorScope(req)
      if (productId) {
        const product: any = await (database as any).product.findByPk(productId, { transaction: t })
        if (!product) throw new Error(`Product ${productId} not found`)
        assertVendorAccess(
          scope,
          Number(product.vendorId ?? product.get?.('vendorId')),
          'Unauthorized to update this product'
        )
      }
      const attributeId = Number(req.params.attributeId)
      const attribute = await database.productAttribute.findByPk(attributeId, { transaction: t })
      if (!attribute) throw new Error(`Attribute ${attributeId} not found`)
      await this.destroyAttributeCascade(attribute, t)
      await t.commit()
      return true
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /**
   * Bulk-sync a product's attributes and variants from the combined editor.
   * PUT /products/:id/variants/sync
   * body: {
   *   generateAll?: boolean,             // false = manual mode, skip backfill
   *   attributes?: [{ id?, name, values }],
   *   deletedAttributeIds?: number[],
   *   variants?: [{ optionValues, skuCode?, quantity?, costPrice?, regularPrice?, salePrice?, wholeSalePrice?, isNegative? }],
   *   removedVariantIds?: number[],
   *   warehouseId?: number               // required when quantities are set
   * }
   * Everything runs in one transaction; returns the refreshed product.
   */
  async syncProductVariants(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const productId = Number(req.params.id)
      const {
        generateAll,
        attributes = [],
        deletedAttributeIds = [],
        variants = [],
        removedVariantIds = [],
        warehouseId
      } = req.body || {}
      if (!productId) throw new Error('product id is required')
      const product: any = await (database as any).product.findByPk(productId, { transaction: t })
      if (!product) throw new Error(`Product ${productId} not found`)
      assertVendorAccess(
        getVendorScope(req),
        Number(product.vendorId ?? product.get?.('vendorId')),
        'Unauthorized to update this product'
      )

      // 1) Attributes removed in the editor take their variants with them
      for (const rawId of deletedAttributeIds || []) {
        const attribute = await database.productAttribute.findByPk(Number(rawId), { transaction: t })
        if (!attribute) continue
        await this.destroyAttributeCascade(attribute, t)
      }

      // 2) Create/update the remaining attributes
      for (const attr of attributes || []) {
        const name = String(attr?.name || '').trim()
        if (!name) continue
        const values = (attr?.values || []).map((v: any) => String(v).trim()).filter(Boolean)
        if (attr.id) {
          const attribute = await database.productAttribute.findByPk(Number(attr.id), { transaction: t })
          if (!attribute) continue
          if (attribute.get('name') !== name) {
            await attribute.update({ name }, { transaction: t })
          }
          // Values dropped from the list take their variants with them
          const existingValues = await database.productAttributeValue.findAll({
            where: { attributeId: attribute.get('id') },
            transaction: t
          })
          const removedValueIds = existingValues
            .filter((v: any) => !values.includes(v.get('value')))
            .map((v: any) => v.get('id'))
          if (removedValueIds.length > 0) {
            await this.deleteVariantsByValueIds(productId, removedValueIds, t)
            await database.productAttributeValue.destroy({ where: { id: removedValueIds }, transaction: t })
          }
          await this.syncAttribute(productId, attribute.get('id'), name, values, t)
        } else {
          await this.syncAttribute(productId, null, name, values, t)
        }
      }

      // 3) Generate-all mode recreates every missing combination; manual mode does not
      if (generateAll !== false) {
        await this.backfillVariants(productId, product, t)
      }

      // 4) Variants explicitly removed in manual mode
      for (const rawId of removedVariantIds || []) {
        const variant = await (database as any).productVariant.findByPk(Number(rawId), { transaction: t })
        if (!variant) continue
        await (database as any).inventory.destroy({ where: { variantId: variant.get('id') }, transaction: t })
        await variant.destroy({ transaction: t })
      }

      // 5) Upsert listed variants: update existing combinations, create picked ones
      const currentVariants = await (database as any).productVariant.findAll({
        where: { productId },
        include: [
          {
            model: database.productAttributeValue,
            as: 'attributeValues',
            through: { attributes: [] }
          }
        ],
        transaction: t
      })
      const comboKey = (values: string[]) =>
        values
          .map((v) => String(v).trim().toLowerCase())
          .sort()
          .join('||')
      const existingByKey = new Map(
        currentVariants.map((v: any) => [
          comboKey(((v.get('attributeValues') || []) as any[]).map((val) => val.get('value'))),
          v
        ])
      )

      const baseSku = (product as any).skuCode || (product as any).code || String(productId)
      let skuTemplate: string | undefined
      try {
        const settings = await new SettingService().getForVendor((product as any)?.vendorId)
        skuTemplate = settings?.skuTemplate ?? undefined
      } catch (e) {
        console.warn('settings not available for variant sku generation', e)
      }
      const takenSkus = new Set<string>([baseSku, ...currentVariants.map((v: any) => v.get('skuCode'))])

      // P6: resolve every attribute value for this product ONCE, then map
      // option (name, value) pairs in memory instead of running a
      // findOne-with-include query per option of every variant.
      const allValueRows = await database.productAttributeValue.findAll({
        where: { productId },
        include: [{ model: database.productAttribute, attributes: ['id', 'name', 'productId'] }],
        transaction: t
      })
      const valueRowKey = (attrName: string, value: string) =>
        `${String(attrName).trim().toLowerCase()}||${String(value).trim().toLowerCase()}`
      const valueRowMap = new Map<string, any>()
      for (const row of allValueRows as any[]) {
        const attrName = row.get('productAttribute')?.get?.('name') ?? (row as any).productAttribute?.name
        if (attrName != null) {
          valueRowMap.set(valueRowKey(String(attrName), String(row.get('value'))), row)
        }
      }

      for (const v of variants || []) {
        const options: Record<string, string> = v?.optionValues || {}
        if (!options || Object.keys(options).length === 0) continue

        // Resolve each option back to its attribute-value row
        const valueRows: any[] = []
        let complete = true
        for (const [name, value] of Object.entries(options)) {
          const valueRow = valueRowMap.get(valueRowKey(name, value))
          if (!valueRow) {
            complete = false
            break
          }
          valueRows.push(valueRow)
        }
        if (!complete) continue

        const fields: Record<string, unknown> = {
          ...(v.skuCode ? { skuCode: String(v.skuCode) } : {}),
          ...(v.salePrice !== undefined && v.salePrice !== '' ? { salePrice: v.salePrice } : {}),
          ...(v.regularPrice !== undefined && v.regularPrice !== '' ? { regularPrice: v.regularPrice } : {}),
          ...(v.wholeSalePrice !== undefined && v.wholeSalePrice !== '' ? { wholeSalePrice: v.wholeSalePrice } : {}),
          ...(v.costPrice !== undefined && v.costPrice !== '' ? { costPrice: v.costPrice } : {}),
          isNegative: Boolean(v.isNegative)
        }

        const key = comboKey(valueRows.map((r) => r.get('value')))
        const existing: any = existingByKey.get(key)
        if (existing) {
          await existing.update(fields, { transaction: t })
          if (v.quantity !== undefined && v.quantity !== '' && warehouseId) {
            await this.adjustVariantStock(existing, Number(v.quantity), Number(warehouseId), t)
          }
        } else {
          const skuCode = v.skuCode
            ? String(v.skuCode)
            : buildVariantSkuWithTemplate(skuTemplate, baseSku, options, takenSkus)
          takenSkus.add(skuCode)
          const variantRow = await (database as any).productVariant
            .build({ productId, skuCode, ...fields })
            .save({ transaction: t })
          // await variantRow.setAttributeValues(
          //   valueRows.map((r) => r.get('id')),
          //   { transaction: t }
          // )
          await variantRow.$set(
            'attributeValues',
            valueRows.map((r) => r.get('id')),
            { transaction: t }
          )
          const quantity = Number(v.quantity ?? 0)
          if (quantity !== 0 && warehouseId) {
            await (database as any).inventory
              .build({
                warehouseId,
                quantity,
                productId,
                variantId: variantRow.get('id')
              })
              .save({ transaction: t })
            await (database as any).transfer
              .build({
                fromWarehouseId: warehouseId,
                quantity,
                productId,
                variantId: variantRow.get('id'),
                type: '0'
              })
              .save({ transaction: t })
          }
        }
      }

      await t.commit()
      return true
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  /** Delete an attribute row together with its values and dependent variants */
  private async destroyAttributeCascade(attribute: any, t: any) {
    const values = await database.productAttributeValue.findAll({
      where: { attributeId: attribute.get('id') },
      transaction: t
    })
    const valueIds = values.map((v: any) => v.get('id'))
    if (valueIds.length > 0) {
      await this.deleteVariantsByValueIds(attribute.get('productId'), valueIds, t)
    }
    await database.productAttributeValue.destroy({ where: { attributeId: attribute.get('id') }, transaction: t })
    await attribute.destroy({ transaction: t })
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

  /** Find-or-create an attribute row and make sure every listed value exists */
  private async syncAttribute(productId: number, attributeId: number | null, name: string, values: string[], t: any) {
    let attribute: any = null
    if (attributeId) {
      attribute = await database.productAttribute.findByPk(attributeId, { transaction: t })
    } else {
      attribute = await database.productAttribute.findOne({
        where: { productId, name },
        transaction: t
      })
    }
    if (!attribute) {
      attribute = await database.productAttribute.build({ name, productId }).save({ transaction: t })
    }
    const cleaned = (values || []).map((raw) => (raw == null ? '' : String(raw).trim())).filter(Boolean)
    if (cleaned.length > 0) {
      // P6: one batched IN fetch + bulkCreate(ignoreDuplicates) replaces the
      // findOne-per-value + INSERT-per-row loop that held gap locks inside
      // the mega-transaction.
      const existingValues = await database.productAttributeValue.findAll({
        where: { attributeId: attribute.get('id'), value: { [Op.in]: cleaned } },
        transaction: t
      })
      const existingSet = new Set(existingValues.map((v: any) => v.get('value')))
      const missing = cleaned.filter((value) => !existingSet.has(value))
      if (missing.length > 0) {
        await database.productAttributeValue.bulkCreate(
          missing.map((value) => ({ value, attributeId: attribute.get('id'), productId })),
          { ignoreDuplicates: true, transaction: t }
        )
      }
    }
    return attribute
  }

  /**
   * Create variant rows for attribute combinations that don't have one yet.
   * Returns the newly created variants.
   */
  private async backfillVariants(productId: number, product: any, t: any) {
    const attributes = await database.productAttribute.findAll({
      where: { productId },
      include: [{ model: database.productAttributeValue, as: 'values' }],
      transaction: t
    })

    const usable = attributes
      .map((a: any) => ({
        name: a.get('name'),
        values: (a.get('values') || []).map((v: any) => v.get('value'))
      }))
      .filter((a: any) => a.values.length > 0)
    if (usable.length === 0) return []

    const combos = buildAttributeCombinations(usable)
    const existingVariants = await (database as any).productVariant.findAll({
      where: { productId },
      include: [
        {
          model: database.productAttributeValue,
          as: 'attributeValues',
          through: { attributes: [] }
        }
      ],
      transaction: t
    })
    const existingKeys = new Set(
      existingVariants.map((v: any) =>
        JSON.stringify(((v.get('attributeValues') || []) as any[]).map((val) => val.get('value')).sort())
      )
    )

    const parent: any = product
    const baseSku = parent?.skuCode || parent?.code || String(productId)
    // Variant SKUs should honor the vendor SKU template when available
    let skuTemplate: string | undefined
    try {
      const settings = await new SettingService().getForVendor((parent as any)?.vendorId)
      skuTemplate = settings?.skuTemplate ?? undefined
    } catch (e) {
      console.warn('settings not available for variant sku generation', e)
    }
    const takenSkus = new Set<string>([baseSku, ...existingVariants.map((v: any) => v.get('skuCode'))])

    const created: any[] = []
    for (const options of combos) {
      const key = JSON.stringify(
        Object.keys(options)
          .sort()
          .map((k) => options[k])
          .sort()
      )
      if (existingKeys.has(key)) continue

      const skuCode = buildVariantSkuWithTemplate(skuTemplate, baseSku, options, takenSkus)
      takenSkus.add(skuCode)
      const variantRow = await (database as any).productVariant.build({ productId, skuCode }).save({ transaction: t })

      const valueIds: number[] = []
      for (const attr of usable) {
        const valueRow = await database.productAttributeValue.findOne({
          where: {
            attributeId: (attributes.find((a: any) => a.get('name') === attr.name) as any).get('id'),
            value: options[attr.name]
          },
          transaction: t
        })
        if (valueRow) valueIds.push(valueRow.get('id'))
      }
      await variantRow.$set('attributeValues', valueIds, { transaction: t })
      created.push(variantRow)
    }
    return created
  }

  /** Remove variants linked to any of the given attribute-value ids */
  private async deleteVariantsByValueIds(productId: number, valueIds: number[], t: any) {
    const variants = await (database as any).productVariant.findAll({
      where: { productId },
      include: [
        {
          model: database.productAttributeValue,
          as: 'attributeValues',
          through: { attributes: [] },
          where: { id: valueIds }
        }
      ],
      transaction: t
    })
    for (const variant of variants) {
      await variant.destroy({ transaction: t })
    }
    return variants.length
  }
}
