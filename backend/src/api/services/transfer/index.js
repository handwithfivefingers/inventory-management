const BaseCRUDService = require("@constant/base");

module.exports = class TransferService extends BaseCRUDService {
  constructor() {
    super("transfer");
  }
  async create({ warehouseId, productId, quantity, ...params }) {
    const t = await this.sequelize.transaction();
    try {
      const newTransfer = await this.createInstance(params, { transaction: t });
      await t.commit();
      return {
        transfer: newTransfer,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
};
