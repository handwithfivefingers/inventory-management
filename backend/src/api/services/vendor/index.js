const BaseCRUDService = require("@constant/base");

module.exports = class VendorService extends BaseCRUDService {
  constructor() {
    super("vendor");
  }
  async create({ name, description, userId }) {
    const t = await this.sequelize.transaction();
    try {
      const p = await this.createInstance(
        {
          name,
          description,
          userId,
        },
        {
          transaction: t,
        }
      );
      await t.commit();
      return {
        vendor: p,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
  async getVendors(params) {
    try {
      const resp = await this.get({
        include: {
          model: this.db.warehouse,
        },
      });
      return resp;
    } catch (error) {
      throw error;
    }
  }
};
