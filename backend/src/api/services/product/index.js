const InventoryService = require("../inventory");
const BaseCRUDService = require("@constant/base");
const { Op, Sequelize } = require("sequelize");

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
      const page = params.page || 1;
      const pageSize = params.pageSize || 10;
      const pagination = `${page * pageSize - pageSize},${pageSize}`;
      let qsString = ``;
      if (params.s) {
        qsString =
          'WHERE name LIKE "%' + params.s + '%" OR code LIKE "%' + params.s + '%" OR skuCode LIKE "%' + params.s + '%"';
      }
      const [rows] = await this.sequelize.query(
        `SELECT *, inventories.quantity as quantity FROM products INNER JOIN inventories ON products.id = inventories.productId AND inventories.warehouseId = ${req.availableWarehouses} ${qsString} LIMIT ${pagination}`
      );
      const [[{ count }]] = await this.sequelize.query(
        `SELECT COUNT(*) as count FROM products INNER JOIN inventories ON products.id = inventories.productId AND inventories.warehouseId = ${req.availableWarehouses} ${qsString} `
      );

      return { rows, count };
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
