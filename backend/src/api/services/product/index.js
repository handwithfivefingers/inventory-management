const InventoryService = require("../inventory");
const BaseCRUDService = require("@constant/base");

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
  async getProduct(params) {
    try {
      const resp = await this.get({
        include: { model: this.db.inventory, attributes: [] },
        where: {
          "$inventories.id$": params.inventoryId,
        },
        attributes: {
          include: [[this.sequelize.col("inventories.quantity"), "quantity"]],
        },
      });
      console.log("resp", resp);
      return resp;
    } catch (error) {
      throw error;
    }
  }
};
