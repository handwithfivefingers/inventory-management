/**
 * @TABLE: Inventory
 * @DESCRIPTION: Middle table - Connection Between Product and Warehouse
 */

const db = require("@db");
const BaseCRUDService = require("@constant/base");

module.exports = class InventoryService extends BaseCRUDService {
  constructor() {
    super("inventory");
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
};
