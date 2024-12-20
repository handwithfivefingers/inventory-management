const db = require("@db");
module.exports = class BaseCRUDService {
  constructor(modelName) {
    this[modelName] = db[modelName];
    this.modelName = modelName;
    this.sequelize = db.sequelize;
    this.db = db;
  }

  createInstance = async (params, options) => {
    try {
      return this[this.modelName].create(params, options);
    } catch (error) {
      throw error;
    }
  };

  updateInstance = async (where, params, options) => {
    try {
      return this[this.modelName].update(where, params, options);
    } catch (error) {}
  };

  delete = async () => {};

  get = async (params) => {
    try {
      return this[this.modelName].findAndCountAll(params);
    } catch (error) {
      throw error;
    }
  };

  findOne = async (params) => {
    try {
      return this[this.modelName].findOne(params);
    } catch (error) {
      throw error;
    }
  };

  /**
   * Extracts pagination parameters from the request object.
   *
   * @param {Object} req - The request object containing query parameters.
   * @param {...string} arg - Additional keys to extract from the request.
   * @returns {Object} An object containing pagination info and additional data.
   */
  getPagination = (req, ...arg) => {
    const params = req.query;
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const offset = page * pageSize - pageSize;
    const limit = Number(pageSize);
    const additionalReturn = {};

    if (arg.length > 0) {
      for (let key of arg) {
        additionalReturn[key] = req[key];
      }
    }

    return {
      offset,
      limit,
      s: params.s || null,
      ...additionalReturn,
    };
  };
};
