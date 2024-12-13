const BaseCRUDService = require("@constant/base");
const { Op } = require("sequelize");
const TransferService = require("../transfer");

module.exports = class OrderService extends BaseCRUDService {
  constructor() {
    super("order");
    this.orderDetail;
  }
  async create({ VAT, surcharge, paymentType, warehouseId, OrderDetails }) {
    const t = await this.sequelize.transaction({});
    try {
      const totalPrice = OrderDetails.reduce((total, item) => (total += Number(item.buyPrice)), 0) + Number(surcharge);
      const totalPaid = Number(totalPrice + (totalPrice / 100) * Number(VAT));
      const p = await this.createInstance(
        {
          VAT,
          surcharge,
          paid: totalPaid,
          price: totalPrice,
          paymentType,
        },
        {
          transaction: t,
        }
      );
      for (let item of OrderDetails) {
        await this.createOrderDetails({ transaction: t, warehouseId, orderId: p.id, ...item });
      }
      await t.commit();
      return p;
    } catch (error) {
      console.log("error", error);
      await t.rollback();
      throw error;
    }
  }
  async createOrderDetails({ name, quantity, productId, warehouseId, transaction, orderId, ...orderDetail }) {
    try {
      const detailItem = this.db.orderDetail.create(
        { ...orderDetail, quantity, warehouseId, orderId: orderId },
        {
          transaction,
        }
      );
      return Promise.all([
        detailItem,
        this.updateInventory({ quantity, productId, warehouseId, transaction }),
        this.updateProductQuantity({ quantity, productId, transaction }),
        this.createTransfer({ quantity, warehouseId, productId, transaction, type: "1" }),
      ]);
    } catch (error) {
      throw error;
    }
  }

  async updateInventory({ productId, warehouseId, quantity, transaction }) {
    try {
      const inventory = await this.db.inventory.findOne({
        where: {
          productId,
          warehouseId,
        },
      });
      inventory.quantity = inventory.quantity - quantity;
      await inventory.save({ transaction });
    } catch (error) {
      throw error;
    }
  }
  async updateProductQuantity({ productId, quantity, transaction }) {
    try {
      const prod = await this.db.product.findByPk(productId);
      prod.sold = prod.sold + quantity;
      await prod.save({ transaction });
    } catch (error) {
      throw error;
    }
  }

  async createTransfer({ transaction, ...params }) {
    try {
      await new TransferService().createInstance(params, { transaction });
    } catch (error) {
      throw error;
    }
  }
  async getOrders(params) {
    try {
      const queryParams = {
        where: {},
        include: [
          {
            model: this.db.orderDetail,
            include: {
              model: this.db.product,
            },
          },
        ],
      };
      if (params.warehouse) {
        queryParams.where = {
          "$orderDetails.warehouseId$": params.warehouse,
        };
      }
      if (params.isProvider) {
        queryParams.where.provider = {
          [Op.ne]: null,
        };
      }
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
