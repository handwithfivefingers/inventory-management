const BaseCRUDService = require("@constant/base");

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
  async getWarehouse(params) {
    try {
      const resp = await this.get({
        where: {
          vendorId: params.vendorId,
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
      });
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
};
