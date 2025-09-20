import database from '#/database'
import { IRequestLocal } from '#/types/common'
import { IProductStatic } from '#/types/product'
import { Op } from 'sequelize'

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
  // async create(req) {
  //   const t = await this.sequelize.transaction()
  //   try {
  //     const { vendor, warehouse } = this.getActiveWarehouseAndVendor(req)
  //     if (!warehouse?.id) throw new Error('Invalid warehouse context')

  //     const { quantity, categories, tags, ...params } = req.body

  //     // Validate required fields
  //     if (!quantity || isNaN(quantity)) throw new Error('Invalid quantity')
  //     if (!params.code) throw new Error('Product code is required')

  //     // Check for existing product
  //     const existing = await this.db.product.findOne({
  //       where: { code: params.code },
  //       transaction: t
  //     })
  //     if (existing) throw new Error(`Product with code ${params.code} already exists`)

  //     const newProduct = await this.createInstance(params, {
  //       transaction: t,
  //       include: [this.db.category, this.db.tag, this.db.unit]
  //     })
  //     if (categories) {
  //       await newProduct.setCategories(categories, { transaction: t })
  //     }
  //     if (tags) {
  //       await newProduct.setTags(tags, { transaction: t })
  //     }
  //     const inventoryInstance = await new InventoryService().createInstance(
  //       {
  //         warehouseId: warehouse.id,
  //         quantity,
  //         productId: newProduct.id
  //       },
  //       {
  //         transaction: t
  //       }
  //     )
  //     const transfer = await new TransferService().createInstance(
  //       {
  //         warehouseId: warehouse.id,
  //         productId: newProduct.id,
  //         quantity,
  //         type: '0'
  //       },
  //       { transaction: t }
  //     )

  //     const productKeyCaches = await cacheGet(cacheKey('Products', 'Key'))

  //     if (productKeyCaches) {
  //       for (let key in productKeyCaches) {
  //         cacheDel(productKeyCaches[key])
  //       }
  //       cacheSet(cacheKey('Products', 'Key'), {})
  //     }

  //     const productKey = cacheKey('Product', newProduct.id, warehouse.id)
  //     await cacheSet(productKey, newProduct)

  //     await t.commit()
  //     return {
  //       inventory: inventoryInstance,
  //       product: newProduct,
  //       transfer: transfer
  //     }
  //   } catch (error) {
  //     console.error(`Product creation failed: ${error.message}`, {
  //       code: req.body.code,
  //       warehouseId: warehouse?.id,
  //       error: error.stack
  //     })
  //     await t.rollback()
  //     throw new Error(`Product creation failed: ${error.message}`)
  //   }
  // }
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
      const { s, page = 1, pageSize = 10 } = req.query

      const limit = Number(pageSize)
      const offset = Number(+page - 1) * Number(pageSize)
      // const { vendor, warehouse } = this.getActiveWarehouseAndVendor(req)
      // const key = CACHE_KEY.getProduct({ warehouse: warehouse.id, limit, offset, s })
      // console.log('warehouse', warehouse)
      const queryParams = {
        where: {},
        // include: [
        //   {
        //     model: database.inventory,
        //     // where: {},
        //     attributes: []
        //   }
        // ],
        // attributes: {
        //   include: [
        //     [
        //       database.sequelize.literal(
        //         '(SELECT sum(inventories.quantity) FROM inventories WHERE product.id = inventories.productId)'
        //       ),
        //       'quantity'
        //     ]
        //   ]
        // },
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
          }
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
}
