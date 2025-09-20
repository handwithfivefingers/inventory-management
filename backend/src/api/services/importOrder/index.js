const BaseCRUDService = require("@constant/base");
const { Op } = require("sequelize");
const OrderService = require("../orders");

module.exports = class ImportOrderService extends BaseCRUDService {
  constructor() {
    super("order");
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
   * @returns {Promise<Object>} - a Promise that resolves to a newly created order
   */
  async create({ VAT, surcharge, paymentType, warehouseId, providerId, OrderDetails }) {
    try {
      const resp = await new OrderService().create({
        VAT,
        surcharge,
        paymentType,
        warehouseId,
        providerId,
        OrderDetails,
        type: "0",
      });
      return resp;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  }
  /**
   * @description Get orders with pagination
   * @param {{ vendor }} params - pagination params, vendorId
   * @return {Promise<Object>} - result of query
   */
  async getOrders(params) {
    try {
      const queryParams = {
        where: {
          providerId: {
            [Op.ne]: null,
          },
        },
        include: [
          {
            model: this.db.provider,
            where: {
              vendorId: params.vendor,
            },
          },
        ],
      };
      const resp = await this.get(queryParams);
      return resp;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Retrieves an order by its ID and vendor ID.
   *
   * @param {{ id }} params - The parameters containing the order ID.
   * @param {string} params.id - The unique identifier of the order.
   * @param {{ vendor }} query - The query parameters containing the vendor ID.
   * @param {string} query.vendor - The unique identifier of the vendor.
   *
   * @returns {Promise<Object|null>} The order details including inventory quantity if found, otherwise null.
   *
   * @throws Will throw an error if retrieving the order fails.
   */
  async getOrderById({ params, query }) {
    try {
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

  /*************  ✨ Codeium Command ⭐  *************/
  /**
   * Create a new order detail.
   * @param {Object} params - { orderDetail, quantity, warehouseId, productId, orderId }
   * @returns {Promise<Object>} created order detail
   */
  /******  23dd2541-0438-48b1-afdb-c99103773245  *******/
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
