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
  async update(where, params, options) {
    try {
      const instance = await this.updateInstance(where, params, options);
      return instance;
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
