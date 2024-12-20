const BaseCRUDService = require("@constant/base");
const { Op } = require("sequelize");
const TransferService = require("../transfer");
const { OrderService } = require("..");

module.exports = class ImportOrderService extends BaseCRUDService {
  constructor() {
    super("order");
  }

  async create({ VAT, surcharge, paymentType, warehouseId, providerId, OrderDetails }) {
    try {
      const params = {
        VAT,
        surcharge,
        paymentType,
        warehouseId,
        providerId,
        OrderDetails,
      };
      console.log("params", params);
      const resp = await new OrderService().create({
        VAT,
        surcharge,
        paymentType,
        warehouseId,
        providerId,
        OrderDetails,
      });
      console.log("resp", resp);
      return resp;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  }
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
