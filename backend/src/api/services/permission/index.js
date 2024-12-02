const InventoryService = require("../inventory");
const BaseCRUDService = require("@constant/base");

module.exports = class PermissionService extends BaseCRUDService {
  constructor() {
    super("permission");
  }
  async create({ C, R, U, D, name, description }) {
    const t = await this.sequelize.transaction();
    try {
      const p = await this.createInstance(
        {
          C,
          R,
          U,
          D,
          name,
          description,
        },
        {
          transaction: t,
        }
      );

      await t.commit();
      return {
        permission: p,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
  async getPermission(params) {
    try {
      const resp = await this.get();
      console.log("resp", resp);
      return resp;
    } catch (error) {
      throw error;
    }
  }
};
