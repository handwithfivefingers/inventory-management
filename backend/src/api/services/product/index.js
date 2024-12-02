const InventoryService = require("../inventory");
const BaseCRUDService = require("@constant/base");
const { Op } = require("sequelize");

module.exports = class ProductService extends BaseCRUDService {
  constructor() {
    super("product");
  }
  async create({ warehouseId, quantity, ...params }) {
    const t = await this.sequelize.transaction();
    try {
      const newProduct = await this.createInstance(params, { transaction: t });
      const inventoryInstance = await new InventoryService().createInstance(
        {
          warehouseId,
          quantity,
          productId: newProduct.id,
        },
        {
          transaction: t,
        }
      );
      await t.commit();
      return {
        inventory: inventoryInstance,
        product: newProduct,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
  async getProduct(req) {
    try {
      const params = req.query;
      const query = {
        where: {
          "$inventories.warehouseId$": {
            [Op.in]: req.availableWarehouses,
          },
        },
        include: { model: this.db.inventory },
        attributes: {
          include: [[this.sequelize.col("inventories.quantity"), "quantity"]],
        },
      };
      if (params.inventoryId) {
        query.where["$inventories.id$"] = params.inventoryId;
      }

      const resp = await this.get(query);
      return resp;
    } catch (error) {
      throw error;
    }
  }

  async getProductById({ params, query }) {
    try {
      const resp = await this.product.findOne({
        where: {
          id: params.id,
          "$inventories.warehouseId$": query.warehouse,
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
};
