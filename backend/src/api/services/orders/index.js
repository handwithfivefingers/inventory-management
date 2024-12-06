const BaseCRUDService = require("@constant/base");
const OrderDetailService = require("../orderDetails");
const InventoryService = require("../inventory");
const ProductService = require("../product");

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

      // await this.db.orderDetail.bulkCreate(
      //   OrderDetails?.map(({ name, ...item }) => ({ ...item, warehouseId, orderId: p.id })),
      //   {
      //     transaction: t,
      //   }
      // );
      const updateInventoryQuan = async (num, pID, wID) => {
        const inven = await this.db.inventory.findOne({
          where: {
            productId: pID,
            warehouseId: wID,
          },
        });
        inven.quantity = inven.quantity - num;
        await inven.save({ transaction: t });
      };

      for (let { name, quantity, productId, ...orderDetail } of OrderDetails) {
        await this.db.orderDetail.create(
          { ...orderDetail, quantity, warehouseId, orderId: p.id },
          {
            transaction: t,
          }
        );
        await updateInventoryQuan(quantity, productId, warehouseId);
        const prod = await this.db.product.findByPk(productId);
        prod.sold = prod.sold + quantity;
        await prod.save({ transaction: t });
      }

      console.log("coming outside loop");
      await t.commit();
      return p;
    } catch (error) {
      console.log("error", error);
      await t.rollback();
      throw error;
    }
  }
  async getOrders(params) {
    try {
      console.log("params", params);
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
};
