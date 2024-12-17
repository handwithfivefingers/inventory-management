const InventoryService = require("../inventory");
const BaseCRUDService = require("@constant/base");
const TransferService = require("../transfer");
const { Op } = require("sequelize");

module.exports = class ProductService extends BaseCRUDService {
  constructor() {
    super("product");
  }
  async create({ warehouseId, quantity, categories, tags, ...params }) {
    const t = await this.sequelize.transaction();
    try {
      const newProduct = await this.createInstance(params, {
        transaction: t,
        include: [this.db.category, this.db.tag, this.db.unit],
      });
      if (categories) {
        await newProduct.setCategories(categories, { transaction: t });
      }
      if (tags) {
        await newProduct.setTags(tags, { transaction: t });
      }
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
      console.log("CREATE PRODUCT ERROR ", error);
      await t.rollback();
      throw error;
    }
  }

  async updateProduct({ id, warehouseId, data }) {
    const t = await this.sequelize.transaction();
    try {
      const currentProduct = await this.db.product.findByPk(id);
      // console.log("query", { where: { id: id } }, data);
      // const currentProduct = await this.updateInstance({ where: { id: id } }, data, { transaction: t });
      console.log("currentProduct", currentProduct);

      await currentProduct.update(data, { transaction: t });

      if (data.categories) {
        await currentProduct.setCategories(data.categories, { transaction: t });
      }
      if (data.tags) {
        await currentProduct.setTags(data.tags, { transaction: t });
      }
      // if (data.unit) {
      //   await currentProduct.setTags(data.unit, { transaction: t });
      // }
      const inven = await new InventoryService().findOne({
        where: {
          productId: id,
          warehouseId: warehouseId,
        },
      });

      // Store - current -> store have 200 , update current quan is 190 -> sold 10
      // if > 0 -> SELLING / EXPORT
      // if < 0 -> IMPORT
      const nextQuantity = inven.quantity - data.quantity;
      inven.quantity = data.quantity;
      await inven.save({ transaction: t });
      await new TransferService().createInstance(
        {
          warehouseId: warehouseId,
          productId: id,
          quantity: nextQuantity,
          type: nextQuantity > 0 ? "1" : "0",
        },
        { transaction: t }
      );
      await t.commit();
    } catch (error) {
      console.log("UPDATE PRODUCT ERROR ", error);
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
          {
            model: this.db.tag,
            attributes: ["id", "name"],
            through: {
              attributes: [],
            },
          },
          {
            model: this.db.unit,
            attributes: ["id", "name"],
          },
        ],
        attributes: {
          include: [[this.sequelize.col("inventories.quantity"), "quantity"]],
          include: [[this.sequelize.col("unit.id"), "unitId"]],
          include: [[this.sequelize.col("unit.name"), "unitName"]],
        },
      });
      return resp;
    } catch (error) {
      throw error;
    }
  }
};
