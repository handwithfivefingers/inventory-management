/**
 * @TABLE: Inventory
 * @DESCRIPTION: Middle table - Connection Between Product and Warehouse
 */

const db = require("@db");
const BaseCRUDService = require("@constant/base");

module.exports = class OrderDetailService extends BaseCRUDService {
  constructor() {
    super("orderDetail");
  }
  async create(params, option) {
    try {
      const instance = await this.createInstance(params, option);
      return instance;
    } catch (error) {
      throw error;
    }
  }
};
