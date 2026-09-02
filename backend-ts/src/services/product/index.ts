import database from '#/database'
import Category from '#/database/models/category'
import Inventory from '#/database/models/inventory'
import Product from '#/database/models/product'
import ProductAttribute from '#/database/models/productAttribute'
import ProductAttributeValue from '#/database/models/productAttributeValue'
import ProductVariant from '#/database/models/productVariant'
import Tag from '#/database/models/tag'
import Unit from '#/database/models/units'
import { ApiError } from '#/response'
import { IRequestLocal } from '#/types/common'
import { getPagination } from '#/utils'
import { applyCodeFormat, generateSkuFromTemplate, getCodeFormat, padSeq } from '#/utils/code-generator'
import { nextSequence } from '#/utils/sequence'
import { assertVendorAccess, assertWarehouseAccess, getVendorScope } from '#/utils/tenant'
import { buildAttributeCombinations, buildVariantSkuWithTemplate } from '#/utils/variant'
import { Op, Sequelize } from 'sequelize'
import { SettingService } from '../setting'

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

      const isExist = await Product.findOne({
        where: {
          vendorId,
          [Op.or]: [{ code: productParams.code }, { skuCode: productParams.skuCode }]
        }
      })
      if (isExist) {
        throw new Error('Product already exists or code/skuCode is duplicated')
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

      if (categories) {
        await (_prod as any).$set('categories', categories, { transaction: t })
      }
      if (tags) {
        await (_prod as any).$set('tags', tags, { transaction: t })
      }
      // New schema: variants carry attributeIds / attributeValueIds (vendor-global)
      const createdVariants: any[] = []
      if (Array.isArray(variants) && variants.length > 0) {
        const baseSku = (productParams as any).skuCode || (productParams as any).code || String((_prod as any).id)
        let skuTemplate: string | undefined
        try {
          skuTemplate = (settings as any)?.skuTemplate
        } catch {}
        const takenSkus = new Set<string>([baseSku])
        for (const v of variants as any[]) {
          const attrIds: number[] = Array.isArray(v.attributes)
            ? v.attributes.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n))
            : []
          const valIds: number[] = Array.isArray(v.attributeValues)
            ? v.attributeValues.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n))
            : []
          // Validate attributes belong to vendor
          if (attrIds.length) {
            const attrs = await ProductAttribute.findAll({ where: { id: attrIds, vendorId }, transaction: t })
            if (attrs.length !== attrIds.length) throw new Error('Invalid attributes for this vendor')
          }
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
              if (attrIds.length && !attrIds.includes(Number(val.attributeId))) {
                throw new Error(`Value ${val.id} does not belong to provided attributes`)
              }
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
          const variantRow: any = await (database as any).productVariant
            .build({
              productId: (_prod as any).id,
              skuCode,
              salePrice: v.salePrice ?? null,
              regularPrice: v.regularPrice ?? null,
              wholeSalePrice: v.wholeSalePrice ?? null,
              costPrice: v.costPrice ?? null,
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
            model: ProductVariant,
            as: 'variants',
            include: [
              {
                model: ProductAttributeValue,
                as: 'attributeValues',
                attributes: ['id', 'value', 'attributeId'],
                through: { attributes: [] },
                include: [{ model: database.productAttribute, attributes: ['id', 'name'] }]
              },
              {
                model: ProductAttribute,
                as: 'attributes',
                attributes: ['id', 'name'],
                through: { attributes: [] }
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
      const productId = Number((req.params as any).id)
      const { variants = [], removedVariantIds = [], warehouseId } = req.body || {}
      if (!productId) throw new Error('product id is required')
      const product: any = await (database as any).product.findByPk(productId, { transaction: t })
      if (!product) throw new Error(`Product ${productId} not found`)
      const vendorId = Number(product.vendorId ?? product.get?.('vendorId'))
      assertVendorAccess(getVendorScope(req), vendorId, 'Unauthorized to update this product')

      // 1) Remove variants explicitly
      for (const rawId of removedVariantIds || []) {
        const variant = await (database as any).productVariant.findByPk(Number(rawId), { transaction: t })
        if (!variant) continue
        if (Number(variant.productId) !== productId) continue
        await (database as any).inventory.destroy({ where: { variantId: variant.get('id') }, transaction: t })
        await variant.destroy({ transaction: t })
      }

      // 2) Prepare helpers for SKU generation
      const currentVariants: any[] = await (database as any).productVariant.findAll({
        where: { productId },
        include: [{ model: database.productAttributeValue, as: 'attributeValues', through: { attributes: [] } }],
        transaction: t
      })
      const baseSku = (product as any).skuCode || (product as any).code || String(productId)
      let skuTemplate: string | undefined
      try {
        const settings = await new SettingService().getForVendor(vendorId)
        skuTemplate = settings?.skuTemplate ?? undefined
      } catch (e) {
        console.warn('settings not available for variant sku generation', e)
      }
      const takenSkus = new Set<string>([baseSku, ...currentVariants.map((v: any) => v.get('skuCode'))])

      // Vendor attribute catalog for validation and fallback conversion of optionValues
      const vendorAttrs: any[] = await ProductAttribute.findAll({ where: { vendorId }, transaction: t })
      const attrById = new Map(vendorAttrs.map((a: any) => [Number(a.id), a]))
      const allValues: any[] = await ProductAttributeValue.findAll({
        where: { attributeId: vendorAttrs.map((a: any) => a.id) },
        include: [{ model: ProductAttribute, attributes: ['id', 'name', 'vendorId'] }],
        transaction: t
      })
      const valueById = new Map(allValues.map((v: any) => [Number(v.id), v]))
      // Map for legacy optionValues -> ids: attrName::value -> valueRow
      const valueByName = new Map<string, any>()
      for (const v of allValues as any[]) {
        const attrName = v.attribute?.name ?? v.productAttribute?.name ?? ''
        valueByName.set(`${String(attrName).trim().toLowerCase()}::${String(v.value).trim().toLowerCase()}`, v)
      }

      for (const v of variants || []) {
        // Resolve attributes/attributeValues: prefer explicit IDs, fallback to legacy optionValues
        let attrIds: number[] = Array.isArray(v.attributes)
          ? v.attributes.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n))
          : []
        let valIds: number[] = Array.isArray(v.attributeValues)
          ? v.attributeValues.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n))
          : []
        if (!attrIds.length && !valIds.length && (v.optionValues || v.options)) {
          const opts: Record<string, string> = v.optionValues || v.options || {}
          for (const [name, val] of Object.entries(opts)) {
            const row = valueByName.get(`${String(name).trim().toLowerCase()}::${String(val).trim().toLowerCase()}`)
            if (row) {
              valIds.push(Number(row.id))
              attrIds.push(Number(row.attributeId))
            }
          }
          attrIds = [...new Set(attrIds)]
          valIds = [...new Set(valIds)]
        }
        if (!valIds.length && !attrIds.length) continue

        // Validate
        if (attrIds.length) {
          for (const aid of attrIds) if (!attrById.has(aid)) throw new Error(`Invalid attribute ${aid}`)
        }
        if (valIds.length) {
          for (const vid of valIds) {
            const row = valueById.get(Number(vid))
            if (!row) throw new Error(`Invalid attributeValue ${vid}`)
            if (Number(row.attribute?.vendorId ?? row.productAttribute?.vendorId) !== vendorId)
              throw new Error('Attribute value vendor mismatch')
          }
        }

        const fields: Record<string, unknown> = {
          ...(v.skuCode ? { skuCode: String(v.skuCode).trim() } : {}),
          ...(v.salePrice !== undefined && v.salePrice !== '' ? { salePrice: v.salePrice } : {}),
          ...(v.regularPrice !== undefined && v.regularPrice !== '' ? { regularPrice: v.regularPrice } : {}),
          ...(v.wholeSalePrice !== undefined && v.wholeSalePrice !== '' ? { wholeSalePrice: v.wholeSalePrice } : {}),
          ...(v.costPrice !== undefined && v.costPrice !== '' ? { costPrice: v.costPrice } : {}),
          isNegative: Boolean(v.isNegative),
          ...(v.isActive !== undefined ? { isActive: Boolean(v.isActive) } : {})
        }

        // Find existing by id or by exact value set
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

        if (existing) {
          if (Number(existing.productId) !== productId) throw new Error('Variant does not belong to product')
          // assign sku if provided else keep
          if (!fields.skuCode) delete (fields as any).skuCode
          await existing.update(fields, { transaction: t })
          if (attrIds.length) await existing.$set('attributes', attrIds, { transaction: t })
          if (valIds.length) await existing.$set('attributeValues', valIds, { transaction: t })
          if (v.quantity !== undefined && v.quantity !== '' && warehouseId) {
            await this.adjustVariantStock(existing, Number(v.quantity), Number(warehouseId), t)
          }
        } else {
          let skuCode = (fields as any).skuCode as string | undefined
          if (!skuCode) {
            const vals = valIds.map((id) => valueById.get(id)).filter(Boolean)
            const optMap: Record<string, string> = {}
            for (const val of vals as any[]) optMap[String(val.attributeId)] = String(val.value)
            skuCode = buildVariantSkuWithTemplate(skuTemplate, baseSku, optMap as any, takenSkus)
          }
          takenSkus.add(skuCode as string)
          const variantRow: any = await (database as any).productVariant
            .build({ productId, skuCode, ...fields })
            .save({ transaction: t })
          if (attrIds.length) await variantRow.$set('attributes', attrIds, { transaction: t })
          if (valIds.length) await variantRow.$set('attributeValues', valIds, { transaction: t })
          const qty = Number(v.quantity ?? 0)
          if (qty !== 0 && warehouseId) {
            await (database as any).inventory
              .build({ warehouseId, quantity: qty, productId, variantId: variantRow.get('id') })
              .save({ transaction: t })
            await (database as any).transfer
              .build({
                fromWarehouseId: warehouseId,
                quantity: qty,
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
