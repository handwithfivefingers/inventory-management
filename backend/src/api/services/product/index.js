const InventoryService = require("../inventory");
const BaseCRUDService = require("@constant/base");
const TransferService = require("../transfer");
const { Op } = require("sequelize");
const { cacheGet, cacheKey, cacheSet, cacheDel } = require("@src/libs/redis");
const { productCacheItem, productCacheList } = require("./cache");
const fs = require("fs");
const XLSX = require("xlsx");
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

      const productKeyCaches = await cacheGet(cacheKey("Products", "Key"));

      if (productKeyCaches) {
        for (let key in productKeyCaches) {
          cacheDel(productKeyCaches[key]);
        }
        cacheSet(cacheKey("Products", "Key"), {});
      }

      const productKey = cacheKey("Product", newProduct.id, warehouseId);
      await cacheSet(productKey, newProduct);

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
  async importProduct(req) {
    try {
      const file = req.file;
      const workbook = XLSX.readFile(file.path);

      const sheets = workbook.SheetNames;
      const data = [];

      for (let sheet of sheets) {
        data.push(...XLSX.utils.sheet_to_json(workbook.Sheets[sheet]));
      }
      for (let { id, unit, ...item } of data) {
        await this.create({ ...item, warehouseId: req.body.warehouse });
      }
      fs.unlinkSync(req.file.path);
      return { message: "Ready", data };
    } catch (error) {
      console.log("IMPORt PRODUCT ERROR ", error);
      fs.unlinkSync(req.file.path);
      await t.rollback();
      throw error;
    }
  }

  async updateProduct({ id, warehouseId, data }) {
    const t = await this.sequelize.transaction();
    try {
      const currentProduct = await this.db.product.findByPk(id);

      await currentProduct.update(data, { transaction: t });

      if (data.categories) {
        await currentProduct.setCategories(data.categories, { transaction: t });
      }
      if (data.tags) {
        await currentProduct.setTags(data.tags, { transaction: t });
      }
      if (data.unit) {
        await currentProduct.setUnit(data.unit, { transaction: t });
      }

      const inven = await new InventoryService().findOne({
        where: {
          productId: id,
          warehouseId: warehouseId,
        },
      });
      const nextQuantity = inven.quantity - data.quantity;

      // Store - current -> store have 200 , update current quan is 190 -> sold 10
      // if > 0 -> SELLING / EXPORT
      // if < 0 -> IMPORT
      if (nextQuantity !== 0) {
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
      }

      const key = cacheKey("Product", currentProduct.id, warehouseId);
      await cacheDel(key);
      await t.commit();
    } catch (error) {
      console.log("UPDATE PRODUCT ERROR ", error);
      await t.rollback();
      throw error;
    }
  }
  async getProduct(req) {
    try {
      const { s, offset, limit, availableWarehouses } = this.getPagination(req, "availableWarehouses");
      const key = cacheKey("Products", "Warehouse", availableWarehouses, "Pagination", `${offset},${limit}`, "s", s);
      console.log("availableWarehouses", availableWarehouses);
      const queryParams = {
        where: {},
        include: [
          {
            model: this.db.inventory,
            where: {
              warehouseId: availableWarehouses,
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
      if (s) {
        queryParams.where = {
          [Op.or]: {
            name: {
              [Op.startsWith]: s,
            },
            code: {
              [Op.startsWith]: s,
            },
            skuCode: {
              [Op.startsWith]: s,
            },
          },
        };
      }
      const { rows, count } = await productCacheList({
        key,
        callback: () => this.get(queryParams),
      });
      return { rows, count };
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  }

  async getProductById({ params, query }) {
    try {
      const key = cacheKey("Product", params.id, query.warehouse);
      const response = await productCacheItem({
        key,
        callback: () => {
          return this.product.findOne({
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
              include: [
                [this.sequelize.col("inventories.quantity"), "quantity"],
                [this.sequelize.col("unit.id"), "unitId"],
                [this.sequelize.col("unit.name"), "unitName"],
              ],
            },
          });
        },
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
};
