import database from '#/database'
import { IRequestLocal } from '#/types/common'
import { IInventoryStatic } from '#/types/inventory'
import { IProductStatic } from '#/types/product'
import { IProductVariantStatic } from '#/types/productVariant'
import { ITransferStatic } from '#/types/transfer'
import { getPagination } from '#/utils'
import { generateSkuFromTemplate, applyCodeFormat, getCodeFormat, padSeq } from '#/utils/code-generator'
import { buildAttributeCombinations, buildVariantSkuWithTemplate, findOverride } from '#/utils/variant'
import { SettingService } from '../setting'
import { FindAttributeOptions, Op, Sequelize } from 'sequelize'

// const InventoryService = require('../inventory')
// const BaseCRUDService = require('@constant/base')
// const TransferService = require('../transfer')
// const { Op } = require('sequelize')
// const { cacheGet, cacheKey, cacheSet, cacheDel } = require('@src/libs/redis')
// const { productCacheItem, productCacheList, CACHE_KEY } = require('./cache')
// const fs = require('fs')
// const XLSX = require('xlsx')

export class ProductService {
  product: IProductStatic = database.product
  inventory: IInventoryStatic = database.inventory
  transfer: ITransferStatic = database.transfer
  productVariant: IProductVariantStatic = database.productVariant
  sequelize: Sequelize = database.sequelize
  async create(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      // const { vendor, warehouse } = this.getActiveWarehouseAndVendor(req)
      // if (!warehouse?.id) throw new Error('Invalid warehouse context')
      // const { warehouse } = getPagination(req.query)
      const { warehouseId, quantity, categories, tags, attributes, variants: variantOverrides, generateAll, ...params } = req.body
      // Validate required fields
      if (!warehouseId) throw new Error('warehouseId is required')
      // The top-level quantity is only used by simple products; variable
      // products carry stock per variant instead.
      const hasVariantAttributes = Array.isArray(attributes) && attributes.length > 0
      if (!hasVariantAttributes && (!quantity || isNaN(quantity))) throw new Error('Invalid quantity')
      // Product code is optional: it is auto-generated from vendor
      // prefix/suffix settings below when not provided.
      // Resolve vendor settings to auto-generate code/skuCode when missing
      const finalVendorId = params.vendorId || (req as any)?.user?.vendorId
      let settings: any = null
      try {
        settings = await new SettingService().getForVendor(finalVendorId)
      } catch (e) {
        console.warn('settings not available for product code generation', e)
      }

      const seq = await this.product.count()
      if (!params.code && settings) {
        const { prefix, suffix } = getCodeFormat(settings.codePrefix, settings.codeSuffix, 'product')
        params.code = applyCodeFormat(padSeq(seq + 1), prefix, suffix)
      }
      if (!params.skuCode && settings) {
        const baseCode = params.code || padSeq(seq + 1)
        params.skuCode = generateSkuFromTemplate(
          settings.skuTemplate,
          {
            CODE: baseCode,
            SEQ: padSeq(seq + 1),
            YYYY: String(new Date().getFullYear())
          },
          baseCode
        )
      }

      // Check for existing product
      const existing = await this.product.findOne({
        where: { code: params.code }
      })

      if (existing) throw new Error(`Product with code ${params.code} already exists`)

      // const newProduct = await this.createInstance(params, {
      //   transaction: t,
      //   include: [this.db.category, this.db.tag, this.db.unit]
      // })
      const _prod = await this.product.build(params)
      await _prod.save({ transaction: t })

      console.log('_prod', _prod, categories)
      if (categories) {
        await _prod.setCategories(categories, { transaction: t })
      }
      if (tags) {
        await _prod.setTags(tags, { transaction: t })
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
          const attrRow = await database.productAttribute
            .build({ name: attr.name, productId: _prod.id })
            .save({ transaction: t })
          for (const value of attr.values || []) {
            if (value == null || value === '') continue
            const valRow = await database.productAttributeValue
              .build({ value, attributeId: attrRow.id, productId: _prod.id })
              .save({ transaction: t })
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
            override?.skuCode ||
            buildVariantSkuWithTemplate(settings?.skuTemplate, baseSku, options, takenSkus)
          takenSkus.add(skuCode)

          const variantRow = await this.productVariant
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
          await variantRow.setAttributeValues(valueIds as number[], { transaction: t })

          // Opening stock per variant (defaults to 0 when not provided)
          const variantQuantity = Number(override?.quantity ?? 0)
          let inventoryRow: any = null
          if (variantQuantity !== 0) {
            inventoryRow = await this.inventory
              .build({
                warehouseId,
                quantity: variantQuantity,
                productId: _prod.id,
                variantId: variantRow.id
              })
              .save({ transaction: t })
            await this.transfer
              .build({
                warehouseId,
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
        const _inv = this.inventory.build({
          warehouseId,
          quantity,
          productId: _prod.id
        })

        const _trans = this.transfer.build({
          warehouseId,
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
  // async importProduct(req) {
  //   try {
  //     const file = req.file
  //     const workbook = XLSX.readFile(file.path)

  //     const sheets = workbook.SheetNames
  //     const data = []

  //     for (let sheet of sheets) {
  //       data.push(...XLSX.utils.sheet_to_json(workbook.Sheets[sheet]))
  //     }
  //     for (let { id, unit, ...item } of data) {
  //       await this.create({ ...item, warehouseId: req.body.warehouse })
  //     }
  //     fs.unlinkSync(req.file.path)
  //     return { message: 'Ready', data }
  //   } catch (error) {
  //     console.log('IMPORt PRODUCT ERROR ', error)
  //     fs.unlinkSync(req.file.path)
  //     await t.rollback()
  //     throw error
  //   }
  // }

  // /**
  //  * @description Update a product in a warehouse
  //  * @param {Object} params - contains update product information
  //  * @param {number} params.id - product ID
  //  * @param {number} params.warehouseId - warehouse ID
  //  * @param {Object} params.data - contains product data to update
  //  * @returns {Promise<void>} - a Promise that resolves when product is updated
  //  */
  // async updateProduct(req) {
  //   const t = await this.sequelize.transaction()
  //   try {
  //     const id = req.params.id
  //     const { vendor, warehouse } = this.getActiveWarehouseAndVendor(req)
  //     const data = req.body
  //     // Find the product by ID
  //     const currentProduct = await this.db.product.findByPk(id)

  //     // Update the product
  //     await currentProduct.update(data, { transaction: t })

  //     // Update categories
  //     if (data.categories) {
  //       await currentProduct.setCategories(data.categories, { transaction: t })
  //     }

  //     // Update tags
  //     if (data.tags) {
  //       await currentProduct.setTags(data.tags, { transaction: t })
  //     }

  //     // Update unit
  //     if (data.unit) {
  //       await currentProduct.setUnit(data.unit, { transaction: t })
  //     }

  //     // Find the inventory of the product in the warehouse
  //     const inven = await new InventoryService().findOne({
  //       where: {
  //         productId: id,
  //         warehouseId: warehouse.id
  //       }
  //     })

  //     // Calculate the next quantity
  //     const nextQuantity = inven.quantity - data.quantity

  //     // Store - current -> store have 200 , update current quan is 190 -> sold 10
  //     // if > 0 -> SELLING / EXPORT
  //     // if < 0 -> IMPORT
  //     if (nextQuantity !== 0) {
  //       // Update the inventory quantity
  //       inven.quantity = data.quantity
  //       await inven.save({ transaction: t })
  //       // Create a new transfer
  //       await new TransferService().createInstance(
  //         {
  //           warehouseId: warehouse.id,
  //           productId: id,
  //           quantity: nextQuantity,
  //           type: nextQuantity > 0 ? '1' : '0'
  //         },
  //         { transaction: t }
  //       )
  //     }

  //     // Delete the product from the Redis cache
  //     const key = cacheKey('Product', id)
  //     await cacheDel(key)
  //     await t.commit()
  //     return true
  //   } catch (error) {
  //     console.log('UPDATE PRODUCT ERROR ', error)
  //     await t.rollback()
  //     throw error
  //   }
  // }
  async getProducts(req: IRequestLocal) {
    try {
      // const { s, offset, limit } = this.getPagination(req)
      const { s, page = 1, pageSize = 10, warehouseId } = req.query
      if (!warehouseId) throw new Error('warehouseId is required')
      const limit = Number(pageSize)
      const offset = Number(+page - 1) * Number(pageSize)
      const queryParams = {
        where: {},
        include: [
          {
            model: database.inventory,
            attributes: [],
            where: {
              warehouseId
            }
          }
        ],
        attributes: {
          include: [
            [
              database.sequelize.literal(
                '(SELECT sum(inventories.quantity) FROM inventories WHERE product.id = inventories.productId)'
              ),
              'quantity'
            ],
            [
              database.sequelize.literal(
                '(SELECT count(*) FROM productVariants WHERE productVariants.productId = product.id)'
              ),
              'variantCount'
            ]
          ]
        } as FindAttributeOptions,
        offset,
        limit
      }
      if (s) {
        queryParams.where = {
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
      console.log('s', s)
      const { rows, count } = await this.product.findAndCountAll(queryParams)
      return { rows, count }
    } catch (error) {
      console.log('error', error)
      throw error
    }
  }

  async getProductById(req: IRequestLocal) {
    try {
      // const key = cacheKey('Product', params.id)
      // const { vendor, warehouse } = this.getActiveWarehouseAndVendor(req)
      // const response = await productCacheItem({
      //   key,
      //   callback: () => {
      //     return this.product.findOne({
      //       where: {
      //         id: params.id,
      //         '$inventories.warehouseId$': warehouse.id
      //       },
      //       include: [
      //         { model: this.db.inventory, attributes: [] },
      //         {
      //           model: this.db.category,
      //           attributes: ['id', 'name'],
      //           through: {
      //             attributes: []
      //           }
      //         },
      //         {
      //           model: this.db.tag,
      //           attributes: ['id', 'name'],
      //           through: {
      //             attributes: []
      //           }
      //         },
      //         {
      //           model: this.db.unit,
      //           attributes: ['id', 'name']
      //         }
      //       ],
      //       attributes: {
      //         include: [
      //           [this.sequelize.col('inventories.quantity'), 'quantity'],
      //           [this.sequelize.col('unit.id'), 'unitId'],
      //           [this.sequelize.col('unit.name'), 'unitName']
      //         ]
      //       }
      //     })
      //   }
      // })
      // return response
      const params = req.params
      return this.product.findOne({
        where: {
          id: params.id
          // '$inventories.warehouseId$': warehouse.id
        },
        include: [
          { model: database.inventory, attributes: [] },
          {
            model: database.category,
            attributes: ['id', 'name'],
            through: {
              attributes: []
            }
          },
          {
            model: database.tag,
            attributes: ['id', 'name'],
            through: {
              attributes: []
            }
          },
          {
            model: database.unit,
            attributes: ['id', 'name']
          },
          {
            model: database.productAttribute,
            as: 'attributes',
            attributes: ['id', 'name'],
            include: [
              {
                model: database.productAttributeValue,
                as: 'values',
                attributes: ['id', 'value']
              }
            ]
          },
          {
            model: this.productVariant,
            as: 'variants',
            include: [
              {
                model: database.productAttributeValue,
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
    } catch (error) {
      throw error
    }
  }

  /**
   * List variants of a product with their attribute combination and,
   * optionally, per-warehouse stock. GET /products/:id/variants?warehouseId=1
   */
  async getProductVariants(req: IRequestLocal) {
    try {
      const productId = Number(req.params.id)
      const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : null
      if (!productId) throw new Error('product id is required')

      const inventoryInclude: any = {
        model: database.inventory,
        attributes: ['id', 'warehouseId', 'quantity', 'variantId']
      }
      if (warehouseId) inventoryInclude.where = { warehouseId }

      return await this.productVariant.findAndCountAll({
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
      throw error
    }
  }

  /**
   * List ALL attribute definitions across products, with values and the
   * owning product. GET /products/attributes
   */
  async listAttributes(req: IRequestLocal) {
    try {
      return await database.productAttribute.findAll({
        include: [
          { model: database.productAttributeValue, as: 'values' },
          {
            model: database.product,
            attributes: ['id', 'name', 'skuCode']
          }
        ],
        order: [['id', 'ASC']]
      })
    } catch (error) {
      throw error
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
      const { variantId } = req.params
      const allowed = [
        'skuCode',
        'salePrice',
        'regularPrice',
        'wholeSalePrice',
        'costPrice',
        'isActive',
        'isNegative'
      ]
      const variant = await this.productVariant.findByPk(variantId, { transaction: t })
      if (!variant) throw new Error(`Variant ${variantId} not found`)

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
      throw error
    }
  }

  /**
   * Delete one variant and its inventory rows.
   * DELETE /products/:id/variants/:variantId
   */
  async deleteVariant(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const { variantId } = req.params
      const variant = await this.productVariant.findByPk(variantId, { transaction: t })
      if (!variant) throw new Error(`Variant ${variantId} not found`)
      await this.inventory.destroy({ where: { variantId: variant.id }, transaction: t })
      await variant.destroy({ transaction: t })
      await t.commit()
      return true
    } catch (error) {
      await t.rollback()
      throw error
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
      return await database.productAttribute.findAll({
        where: { productId },
        include: [{ model: database.productAttributeValue, as: 'values' }],
        order: [['id', 'ASC']]
      })
    } catch (error) {
      throw error
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

      const product = await this.product.findByPk(productId, { transaction: t })
      if (!product) throw new Error(`Product ${productId} not found`)

      await this.syncAttribute(productId, null, String(name).trim(), values || [], t)

      // Generate variants for combinations that don't exist yet
      const created = await this.backfillVariants(productId, product, t)
      await t.commit()
      return { createdVariants: created.length }
    } catch (error) {
      await t.rollback()
      throw error
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

      const product = await this.product.findByPk(productId, { transaction: t })
      await this.backfillVariants(productId, product as any, t)
      await t.commit()
      return { removedValues: removedValueIds.length }
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  /**
   * Delete an attribute, its values and every variant that used them.
   * DELETE /products/:id/attributes/:attributeId
   */
  async deleteAttribute(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const attributeId = Number(req.params.attributeId)
      const attribute = await database.productAttribute.findByPk(attributeId, { transaction: t })
      if (!attribute) throw new Error(`Attribute ${attributeId} not found`)
      await this.destroyAttributeCascade(attribute, t)
      await t.commit()
      return true
    } catch (error) {
      await t.rollback()
      throw error
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
      const product = await this.product.findByPk(productId, { transaction: t })
      if (!product) throw new Error(`Product ${productId} not found`)

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
        const variant = await this.productVariant.findByPk(Number(rawId), { transaction: t })
        if (!variant) continue
        await this.inventory.destroy({ where: { variantId: variant.get('id') }, transaction: t })
        await variant.destroy({ transaction: t })
      }

      // 5) Upsert listed variants: update existing combinations, create picked ones
      const currentVariants = await this.productVariant.findAll({
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
        values.map((v) => String(v).trim().toLowerCase()).sort().join('||')
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
      const takenSkus = new Set<string>([
        baseSku,
        ...currentVariants.map((v: any) => v.get('skuCode'))
      ])

      for (const v of variants || []) {
        const options: Record<string, string> = v?.optionValues || {}
        if (!options || Object.keys(options).length === 0) continue

        // Resolve each option back to its attribute-value row
        const valueRows: any[] = []
        let complete = true
        for (const [name, value] of Object.entries(options)) {
          const valueRow = await database.productAttributeValue.findOne({
            where: { value: String(value).trim() },
            include: [{ model: database.productAttribute, where: { productId, name } }],
            transaction: t
          })
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
          ...(v.regularPrice !== undefined && v.regularPrice !== ''
            ? { regularPrice: v.regularPrice }
            : {}),
          ...(v.wholeSalePrice !== undefined && v.wholeSalePrice !== ''
            ? { wholeSalePrice: v.wholeSalePrice }
            : {}),
          ...(v.costPrice !== undefined && v.costPrice !== '' ? { costPrice: v.costPrice } : {}),
          isNegative: Boolean(v.isNegative)
        }

        const key = comboKey(valueRows.map((r) => r.get('value')))
        const existing: any = existingByKey.get(key)
        if (existing) {
          await existing.update(fields, { transaction: t })
          if (v.quantity !== undefined && v.quantity !== '' && warehouseId) {
            await this.adjustVariantStock(
              existing,
              Number(v.quantity),
              Number(warehouseId),
              t
            )
          }
        } else {
          const skuCode = v.skuCode
            ? String(v.skuCode)
            : buildVariantSkuWithTemplate(skuTemplate, baseSku, options, takenSkus)
          takenSkus.add(skuCode)
          const variantRow = await this.productVariant
            .build({ productId, skuCode, ...fields })
            .save({ transaction: t })
          await variantRow.setAttributeValues(
            valueRows.map((r) => r.get('id')),
            { transaction: t }
          )
          const quantity = Number(v.quantity ?? 0)
          if (quantity !== 0 && warehouseId) {
            await this.inventory
              .build({
                warehouseId,
                quantity,
                productId,
                variantId: variantRow.get('id')
              })
              .save({ transaction: t })
            await this.transfer
              .build({
                warehouseId,
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
      throw error
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
    const row: any = await this.inventory.findOne({
      where: { productId: variant.get('productId'), variantId: variant.get('id'), warehouseId },
      transaction: t
    })
    const current = Number(row?.get('quantity') ?? 0)
    const delta = target - current
    if (!row && target !== 0) {
      await this.inventory
        .build({ warehouseId, quantity: target, productId: variant.get('productId'), variantId: variant.get('id') })
        .save({ transaction: t })
    } else if (row) {
      await row.update({ quantity: target }, { transaction: t })
    }
    if (delta !== 0) {
      await this.transfer
        .build({
          warehouseId,
          quantity: Math.abs(delta),
          productId: variant.get('productId'),
          variantId: variant.get('id'),
          type: delta > 0 ? '0' : '1'
        })
        .save({ transaction: t })
    }
  }

  /** Find-or-create an attribute row and make sure every listed value exists */
  private async syncAttribute(
    productId: number,
    attributeId: number | null,
    name: string,
    values: string[],
    t: any
  ) {
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
      attribute = await database.productAttribute
        .build({ name, productId })
        .save({ transaction: t })
    }
    for (const raw of values || []) {
      const value = raw == null ? '' : String(raw).trim()
      if (!value) continue
      const existing = await database.productAttributeValue.findOne({
        where: { attributeId: attribute.id ?? attribute.get('id'), value },
        transaction: t
      })
      if (!existing) {
        await database.productAttributeValue
          .build({ value, attributeId: attribute.get('id'), productId })
          .save({ transaction: t })
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
    const existingVariants = await this.productVariant.findAll({
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
        JSON.stringify(
          ((v.get('attributeValues') || []) as any[])
            .map((val) => val.get('value'))
            .sort()
        )
      ),
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
    const takenSkus = new Set<string>([
      baseSku,
      ...existingVariants.map((v: any) => v.get('skuCode'))
    ])

    const created: any[] = []
    for (const options of combos) {
      const key = JSON.stringify(Object.keys(options).sort().map((k) => options[k]).sort())
      if (existingKeys.has(key)) continue

      const skuCode = buildVariantSkuWithTemplate(skuTemplate, baseSku, options, takenSkus)
      takenSkus.add(skuCode)
      const variantRow = await this.productVariant
        .build({ productId, skuCode })
        .save({ transaction: t })

      const valueIds: number[] = []
      for (const attr of usable) {
        const valueRow = await database.productAttributeValue.findOne({
          where: { attributeId: (attributes.find((a: any) => a.get('name') === attr.name) as any).get('id'), value: options[attr.name] },
          transaction: t
        })
        if (valueRow) valueIds.push(valueRow.get('id'))
      }
      await variantRow.setAttributeValues(valueIds, { transaction: t })
      created.push(variantRow)
    }
    return created
  }

  /** Remove variants linked to any of the given attribute-value ids */
  private async deleteVariantsByValueIds(productId: number, valueIds: number[], t: any) {
    const variants = await this.productVariant.findAll({
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
