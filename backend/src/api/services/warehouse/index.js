const BaseCRUDService = require("@constant/base");
const redisClient = require("@src/config/redis");
const { cacheGet, cacheKey, cacheSet } = require("@src/libs/redis");
const { retrieveUser } = require("@src/libs/utils");

module.exports = class WarehouseService extends BaseCRUDService {
  constructor() {
    super("warehouse");
  }
  async create({ name, isMain, email, address, phone, vendorId }) {
    const t = await this.sequelize.transaction();
    try {
      const p = await this.createInstance(
        {
          name,
          name,
          isMain,
          email,
          address,
          phone,
          vendorId,
        },
        {
          transaction: t,
        }
      );

      await t.commit();
      return {
        warehouse: p,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
  async getWarehouse(req) {
    try {
      const { vendor, warehouse } = this.getActiveWarehouseAndVendor(req);
      const { offset, limit } = this.getPagination(req);
      const resp = await this.get({
        where: {
          vendorId: vendor.id,
        },
        include: [
          {
            model: this.db.inventory,
            attributes: [],
          },
        ],
        attributes: {
          include: [[this.sequelize.fn("sum", this.sequelize.col("inventories.quantity")), "quantity"]],
        },
        offset,
        limit,
        subQuery: false, // Unknown column "inventories.quantity" in field list
        distinct: true,
        logging: (sql) => console.log(sql),
      });
      console.log("resp", resp.rows[0]);
      return resp;
    } catch (error) {
      throw error;
    }
  }
  async getWarehouseById({ params, query }) {
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

  async activeWarehouse(req) {
    try {
      const { warehouse } = req.body;
      const user = retrieveUser(req);
      const _user = await cacheGet(cacheKey("User", user.email));
      const _nextUser = { ..._user };
      const warehouses = _user.warehouses;
      const filter = warehouses.filter((w) => w.id === warehouse);
      if (req.body.warehouse && filter.length) {
        _nextUser.activeWarehouse = filter[0];
        await cacheSet(cacheKey("User", user.email), _nextUser);
      }
      return _nextUser.activeWarehouse;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  }
};
