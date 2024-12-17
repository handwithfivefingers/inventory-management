/**
 * @TABLE: Inventory
 * @DESCRIPTION: Middle table - Connection Between Product and Warehouse
 */

const db = require("@db");
const BaseCRUDService = require("@constant/base");

module.exports = class CategoriesService extends BaseCRUDService {
  constructor() {
    super("category");
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

  async getCategories(params) {
    try {
      console.log("params", params);
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
      const resp = await this.category.findOne({
        where: {
          id: params.id,
        },
        include: this.db.product,
      });
      return resp;
    } catch (error) {
      throw error;
    }
  }
};
