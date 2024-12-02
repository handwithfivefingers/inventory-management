const BaseCRUDService = require("@constant/base");

module.exports = class RoleService extends BaseCRUDService {
  constructor() {
    super("role");
  }
  async create({ name, description, permission }) {
    const t = await this.sequelize.transaction();
    try {
      const p = await this.createInstance(
        {
          name,
          description,
        },
        {
          transaction: t,
        }
      );
      if (permission) {
        await p.createPermission(permission, { transaction: t });
      }

      await t.commit();
      return {
        role: p,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
  async getRoles(params) {
    try {
      const resp = await this.get({
        include: {
          model: this.db.permission,
        },
      });
      console.log("resp", resp);
      return resp;
    } catch (error) {
      throw error;
    }
  }
};
