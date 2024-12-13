const InventoryService = require("../inventory");
const BaseCRUDService = require("@constant/base");
const TransferService = require("../transfer");
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
      const transfer = await new TransferService().createInstance(
        {
          warehouseId,
          productId: newProduct.id,
          quantity,
          type: "0",
        },
        { transaction: t }
      );
      await t.commit();
      return {
        inventory: inventoryInstance,
        product: newProduct,
        transfer: transfer,
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
      const offset = page * pageSize - pageSize;
      const limit = Number(pageSize);
      const queryParams = {
        where: {},
        include: [
          {
            model: this.db.inventory,
            where: {
              warehouseId: req.availableWarehouses,
            },
            attributes: [],
          },
        ],
        attributes: {
          include: [
            [
              this.sequelize.literal(
                "(SELECT sum(inventories.quantity) FROM inventories WHERE product.id = inventories.productId)"
              ),
              "quantity",
            ],
          ],
        },
        offset,
        limit,
      };
      if (params.s) {
        queryParams.where = {
          [Op.or]: {
            name: {
              [Op.startsWith]: params.s,
            },
            code: {
              [Op.startsWith]: params.s,
            },
            skuCode: {
              [Op.startsWith]: params.s,
            },
          },
        };
      }

      const { rows, count } = await this.get(queryParams);

      // const pagination = `${page * pageSize - pageSize},${pageSize}`;
      // let qsString = ``;
      // if (params.s) {
      //   qsString =
      //     'WHERE name LIKE "%' + params.s + '%" OR code LIKE "%' + params.s + '%" OR skuCode LIKE "%' + params.s + '%"';
      // }
      // const [rows] = await this.sequelize.query(
      //   `SELECT *, inventories.quantity as quantity FROM products INNER JOIN inventories ON products.id = inventories.productId AND inventories.warehouseId = ${req.availableWarehouses} ${qsString} LIMIT ${pagination}`
      // );
      // const [[{ count }]] = await this.sequelize.query(
      //   `SELECT COUNT(*) as count FROM products INNER JOIN inventories ON products.id = inventories.productId AND inventories.warehouseId = ${req.availableWarehouses} ${qsString} `
      // );

      return { rows, count };
    } catch (error) {
      console.log("error", error);
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
        include: [
          { model: this.db.inventory, attributes: [] },
          {
            model: this.db.category,
            attributes: ["id", "name"],
            through: {
              attributes: [],
            },
          },
        ],
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
