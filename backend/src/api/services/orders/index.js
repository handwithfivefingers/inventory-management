const BaseCRUDService = require("@constant/base");
const { Op } = require("sequelize");
const TransferService = require("../transfer");
const { cacheDel, cacheKey } = require("@src/libs/redis");
const { retrieveUser } = require("@src/libs/utils");

module.exports = class OrderService extends BaseCRUDService {
  constructor() {
    super("order");
    this.orderDetail;
  }
  /**
   * @description Create a new order
   * @param {Object} params - contains order creation information
   * @param {number} params.VAT - VAT value
   * @param {number} params.surcharge - surcharge value
   * @param {string} params.paymentType - payment type, can be "cash" or "transfer"
   * @param {number} params.warehouseId - warehouse ID
   * @param {number} params.providerId - provider ID
   * @param {Array<Object>} params.OrderDetails - an array of objects containing order details information
   * @param {string} params.type - order type, can be "1" or "0", default is "1"
   * @returns {Promise<Object>} - a Promise that resolves to a newly created order
   */
  async create({ VAT, surcharge, paymentType, warehouseId, providerId, OrderDetails, type = "1" }) {
    // Start a new transaction
    const t = await this.sequelize.transaction({});
    try {
      // Calculate the total price of the order details and add the surcharge
      const totalPrice = OrderDetails.reduce((total, item) => (total += Number(item.buyPrice)), 0) + Number(surcharge);

      // Calculate the total amount to be paid including VAT
      const totalPaid = Number(totalPrice + (totalPrice / 100) * Number(VAT));

      // Create the order instance
      const p = await this.createInstance(
        {
          VAT,
          surcharge,
          paid: totalPaid,
          price: totalPrice,
          paymentType,
          providerId,
        },
        {
          transaction: t,
        }
      );

      // Create order details for each item
      for (let item of OrderDetails) {
        await this.createOrderDetails({ transaction: t, warehouseId, orderId: p.id, type, ...item });
      }

      // Commit the transaction
      await t.commit();
      return p;
    } catch (error) {
      // Log the error and rollback the transaction
      console.log("error", error);
      await t.rollback();
      throw error;
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
  async createOrderDetails({ name, quantity, productId, warehouseId, transaction, orderId, type, ...orderDetail }) {
    try {
      // Create a new order detail
      const detailItem = this.db.orderDetail.create(
        // Create an object with the required properties
        { ...orderDetail, quantity, warehouseId, orderId: orderId },
        {
          // Pass the transaction object to the create method
          transaction,
        }
      );
      // Delete the product from the Redis cache
      await cacheDel(cacheKey("Product", productId, warehouseId));
      // Return an array of promises
      return Promise.all([
        // Resolve to the created order detail
        detailItem,
        // Update the inventory
        this.updateInventory({ quantity, productId, warehouseId, transaction }),
        // Update the product quantity
        this.updateProductQuantity({ quantity, productId, transaction }),
        // Create a new transfer
        this.createTransfer({ quantity, warehouseId, productId, transaction, type }),
      ]);
    } catch (error) {
      // Log the error and throw it
      console.log("error", error);
      throw error;
    }
  }

  /**
   * @description Update inventory of a product in a warehouse
   * @param {Object} params - contains update inventory information
   * @param {number} params.productId - product ID
   * @param {number} params.warehouseId - warehouse ID
   * @param {number} params.quantity - product quantity
   * @param {Transaction} params.transaction - transaction object
   * @returns {Promise<void>} - a Promise that resolves when inventory is updated
   */
  async updateInventory({ productId, warehouseId, quantity, transaction }) {
    try {
      const inventory = await this.db.inventory.findOne({
        where: {
          productId,
          warehouseId,
        },
      });
      if (!inventory) {
        throw new Error("Inventory not found");
      }
      inventory.quantity = inventory.quantity - quantity;
      await inventory.save({ transaction });
    } catch (error) {
      throw error;
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
  async updateProductQuantity({ productId, quantity, transaction }) {
    try {
      const prod = await this.db.product.findByPk(productId);
      prod.sold = prod.sold + quantity;
      await prod.save({ transaction });
    } catch (error) {
      throw error;
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
  async createTransfer({ transaction, ...params }) {
    try {
      await new TransferService().createInstance(params, { transaction });
    } catch (error) {
      throw error;
    }
  }
  /**
   * @function getOrders
   * @description Get orders with pagination
   * @param {Object} params - pagination params, warehouseId, isProvider
   * @return {Promise<Object>} - result of query
   */
  async getOrders(req) {
    try {
      const params = req.query;
      const { offset, limit } = this.getPagination(req);
      const { warehouse, vendor } = this.getActiveWarehouseAndVendor(req);
      console.log("warehouse", warehouse);
      const PROVIDER = {
        0: {
          [Op.eq]: null,
        },
        1: {
          [Op.ne]: null,
        },
      };
      const queryParams = {
        where: {
          providerId: params?.isProvider ? PROVIDER[1] : null,
          warehouseId: warehouse.id,
        },
        include: [
          {
            model: this.db.orderDetail,
            include: {
              model: this.db.product,
            },
          },
        ],
        offset,
        limit,
        distinct: true, // Prevents duplicate rows when using JOIN
      };
      const resp = await this.get(queryParams);
      return resp;
    } catch (error) {
      console.warn("error", error);
      throw error;
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

  async getOrderById({ params, query }) {
    try {
      console.log('getOrders')

      const resp = await this.warehouse.findOne({
        where: {
          id: params.id,
          vendorId: query.vendor,
        },
        include: { model: this.db.inventory, attributes: [] },
        attributes: {
          include: [[this.sequelize.col("inventories.quantity"), "quantity"]],
        },
      });
      return resp;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new order detail.
   * @param {{ orderDetail, quantity, warehouseId, productId, orderId }} params
   */
  async onCreateOrderDetail(params) {
    try {
      const resp = await this.db.orderDetail.create(params);
      return resp;
    } catch (err) {
      throw err;
    }
  }

  async importOrder(params) {
    try {
    } catch (error) {}
  }
};
