/**
 * @TABLE: Inventory
 * @DESCRIPTION: Middle table - Connection Between Product and Warehouse
 */

const db = require("@db");
const BaseCRUDService = require("@constant/base");

module.exports = class UnitsService extends BaseCRUDService {
  constructor() {
    super("unit");
  }
  async create(params) {
    try {
      const instance = await this.createInstance(params);
      return instance;
    } catch (error) {
      throw error;
    }
  }
  async update(req) {
    try {
      const resp = await this.unit.update(req.body, { where: { id: req.params.id } });
      return resp;
    } catch (error) {
      throw error;
    }
  }

  async getUnits(params) {
    try {
      const queryParams = {
        where: {
          vendorId: params.vendorId,
        },
      };
      const resp = await this.get(queryParams);
      return resp;
    } catch (error) {
      throw error;
    }
  }

  async getById({ params, query }) {
    try {
      const resp = await this.unit.findOne({
        where: {
          id: params.id,
        },
      });
      return resp;
    } catch (error) {
      throw error;
    }
  }
};
