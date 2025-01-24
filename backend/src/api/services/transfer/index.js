const BaseCRUDService = require("@constant/base");
const { Op } = require("sequelize");

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
  async getHistoryByProductId(req) {
    try {
      const { id } = req.params;
      const resp = await this.get({
        where: {
          productId: id,
          warehouseId: {
            [Op.in]: req.locals.user.warehouses.map((item) => item.id),
          },
        },
      });
      return resp;
    } catch (error) {
      throw error;
    }
  }
};
