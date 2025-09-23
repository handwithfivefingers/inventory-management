import database from '#/database'
import { IInventoryStatic } from '#/types/inventory'
import { IOrderModel, IOrderStatic } from '#/types/order'
import { IOrderDetailStatic } from '#/types/orderDetail'
import { IProductStatic } from '#/types/product'
import { Op, Optional, Transaction } from 'sequelize'
import { TransferService } from '../transfer'
import { Request } from 'express'
interface IOrderCreateParams {
  orderDetails: any[]
  price?: number | string
  VAT?: number | string
  surcharge?: number | string
  paid: number | string
  paymentType: 'cash' | 'transfer'
  warehouseId: number | string
  providerId: number | string
  type?: string
}
interface IOrderDetailCreateParams {
  name: string
  quantity: number
  productId: number
  warehouseId: number
  orderId: number
  price: number
  buyPrice: number
  note: string
  type: string
  transaction: Transaction
}

interface IInventoryUpdateParams {
  productId: number
  warehouseId: number
  quantity: number
  transaction: Transaction
}

interface IProductUpdateParams {
  quantity: number
  productId: number
  transaction: Transaction
}
interface ICreateTransferParams {
  transaction: Transaction
  warehouseId: number
  quantity: number
  productId: number
  type: string
}
export default class OrderService {
  //   this[modelName] = db[modelName];
  // this.modelName = modelName;
  // this.sequelize = db.sequelize;
  // this.db = db;
  order: IOrderStatic = database.order
  orderDetail: IOrderDetailStatic = database.orderDetail
  inventory: IInventoryStatic = database.inventory
  product: IProductStatic = database.product
  sequelize = database.sequelize

  async create({ VAT, surcharge, paymentType, warehouseId, providerId, orderDetails, type = '1' }: IOrderCreateParams) {
    // Start a new transaction
    const t = await this.sequelize.transaction()
    try {
      // Calculate the total price of the order details and add the surcharge
      const totalPrice = orderDetails.reduce((total, item) => (total += Number(item.buyPrice)), 0) + Number(surcharge)

      // Calculate the total amount to be paid including VAT
      const totalPaid = Number(totalPrice + (totalPrice / 100) * Number(VAT))

      const orderParams: Partial<Omit<IOrderModel, 'id'>> = {
        VAT: Number(VAT),
        surcharge: Number(surcharge),
        paid: totalPaid,
        price: totalPrice,
        paymentType,
        warehouseId: Number(warehouseId)
      }
      if (providerId) {
        orderParams.providerId = Number(providerId)
      }

      const orderBuilder = this.order.build(orderParams as Optional<IOrderModel, 'id'>)

      const p = await orderBuilder.save({ transaction: t })

      // Create order details for each item
      for (let item of orderDetails) {
        await this.createOrderDetails({ transaction: t, warehouseId, orderId: p.id, type, ...item })
      }

      // Commit the transaction
      await t.commit()
      return p
    } catch (error) {
      // Log the error and rollback the transaction
      console.log('error', error)
      await t.rollback()
      throw error
    }
  }
  /**
   * Create a new order detail.
   * @param {Object} params - contains order detail creation information
   * @param {string} params.name - product name
   * @param {number} params.quantity - product quantity
   * @param {number} params.productId - product ID
   * @param {number} params.warehouseId - warehouse ID
   * @param {Transaction} params.transaction - transaction object
   * @param {number} params.orderId - order ID
   * @param {string} params.type - order type, can be "1" or "0", default is "1"
   * @returns {Promise<Array<Object>>} - a Promise that resolves to an array of created order details, updated inventory and product quantity
   *
   * This function creates a new order detail and updates the inventory, product quantity and creates a new transfer.
   */
  async createOrderDetails({
    name,
    quantity,
    productId,
    warehouseId,
    orderId,
    type,
    note,
    transaction,
    ...orderDetail
  }: IOrderDetailCreateParams) {
    try {
      // Create a new order detail
      const orderDetailBuilder = this.orderDetail.build({
        quantity,
        warehouseId,
        orderId,
        note,
        ...orderDetail
      })
      // Delete the product from the Redis cache
      // Return an array of promises
      return Promise.all([
        orderDetailBuilder.save({ transaction }),
        // Update the inventory
        this.updateInventory({ quantity, productId, warehouseId, transaction }),
        // Update the product quantity
        this.updateProductQuantity({ quantity, productId, transaction }),
        // Create a new transfer
        this.createTransfer({ quantity, warehouseId, productId, transaction, type })
      ])
    } catch (error) {
      // Log the error and throw it
      console.log('error', error)
      throw error
    }
  }

  async updateInventory({ productId, warehouseId, quantity, transaction }: IInventoryUpdateParams) {
    try {
      const inventory = await this.inventory.findOne({
        where: {
          productId,
          warehouseId
        }
      })
      if (!inventory) {
        throw new Error('Inventory not found')
      }
      inventory.quantity = inventory.quantity - quantity
      await inventory.save({ transaction })
    } catch (error) {
      throw error
    }
  }
  /**
   * @description Update product sold quantity
   * @param {Object} params - contains update product quantity information
   * @param {number} params.productId - product ID
   * @param {number} params.quantity - quantity to add to product sold
   * @param {Transaction} params.transaction - transaction object
   * @returns {Promise<void>} - a Promise that resolves when product is updated
   */
  async updateProductQuantity({ productId, quantity, transaction }: IProductUpdateParams) {
    try {
      const prod = await this.product.findByPk(productId)
      if (!prod) throw new Error('Product not found')
      prod.sold = prod.sold + quantity
      await prod.save({ transaction })
    } catch (error) {
      throw error
    }
  }

  /**
   * @description Create a new transfer
   * @param {Object} params - contains creation information
   * @param {Transaction} params.transaction - transaction object
   * @param {number} params.warehouseId - warehouse ID
   * @param {number} params.quantity - quantity to transfer
   * @param {number} params.productId - product ID
   * @param {string} params.type - transfer type, "0" for export, "1" for import
   * @returns {Promise<void>} - a Promise that resolves when transfer is created
   */
  async createTransfer({ transaction, ...params }: ICreateTransferParams) {
    try {
      // await new TransferService().createInstance(params, { transaction })
      const transferResponse = await new TransferService().create({ ...params }, { transaction })
      return transferResponse
    } catch (error) {
      throw error
    }
  }
  /**
   * @function getOrders
   * @description Get orders with pagination
   * @param {Object} params - pagination params, warehouseId, isProvider
   * @return {Promise<Object>} - result of query
   */
  async getOrders(req: Request) {
    try {
      console.log('getOrders coming')
      const params = req.query
      // const { offset, limit } = this.getPagination(req)
      const { offset = 0, limit = 10, warehouseId, isProvider } = params
      if (!warehouseId) throw new Error('warehouseId is required')
      // const { warehouse, vendor } = this.getActiveWarehouseAndVendor(req)
      // console.log('warehouse', warehouse)
      const queryParams = {
        where: {
          warehouseId: warehouseId as string,
          providerId: isProvider ? { [Op.ne]: null } : { [Op.eq]: null }
        },
        include: [
          {
            model: database.orderDetail
          }
        ],
        offset: Number(offset),
        limit: Number(limit),
        distinct: true // Prevents duplicate rows when using JOIN
      }
      const resp = await this.order.findAndCountAll(queryParams)
      console.log('resp', resp)
      return resp
    } catch (error) {
      console.warn('error', error)
      throw error
    }
  }

  /**
   * Retrieves an order by its ID and vendor ID.
   *
   * @param {Object} params - The parameters containing the order ID.
   * @param {string} params.id - The unique identifier of the order.
   * @param {Object} query - The query parameters containing the vendor ID.
   * @param {string} query.vendor - The unique identifier of the vendor.
   *
   * @returns {Promise<Object|null>} The order details including inventory quantity if found, otherwise null.
   *
   * @throws Will throw an error if retrieving the order fails.
   */

  // async getOrderById({ params, query }) {
  //   try {
  //     console.log('getOrders')

  //     const resp = await this.warehouse.findOne({
  //       where: {
  //         id: params.id,
  //         vendorId: query.vendor
  //       },
  //       include: { model: this.db.inventory, attributes: [] },
  //       attributes: {
  //         include: [[this.sequelize.col('inventories.quantity'), 'quantity']]
  //       }
  //     })
  //     return resp
  //   } catch (error) {
  //     throw error
  //   }
  // }

  // /**
  //  * Create a new order detail.
  //  * @param {{ orderDetail, quantity, warehouseId, productId, orderId }} params
  //  */
  // async onCreateOrderDetail(params) {
  //   try {
  //     const resp = await this.db.orderDetail.create(params)
  //     return resp
  //   } catch (err) {
  //     throw err
  //   }
  // }

  // async importOrder(params) {
  //   try {
  //   } catch (error) {}
  // }
}
