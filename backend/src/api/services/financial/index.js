const BaseCRUDService = require("@constant/base");
const { Op } = require("sequelize");
const { OrderService } = require("..");

module.exports = class FinancialService extends BaseCRUDService {
  constructor() {
    super("transfer");
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
      const resp = await new OrderService().create({
        VAT,
        surcharge,
        paymentType,
        warehouseId,
        providerId,
        OrderDetails,
      });
      return resp;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  }
  async getFinancial(req) {
    try {
      const { s, offset, limit } = this.getPagination(req);
      const queryParams = {
        where: {
          warehouseId: req.query.warehouse,
        },
        offset,
        limit,
        include: [
          {
            model: this.db.product,
            required: false,
          },
        ],
        attributes: [
          "updatedAt",
          "type",
          [this.sequelize.literal("SUM(product.regularPrice * transfer.quantity)"), "totalPrice"],
        ],
        group: ["updatedAt", "type"],
        raw: true,
      };
      const resp = await this.get(queryParams);
      return resp;
    } catch (error) {
      console.log("error", error);
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
