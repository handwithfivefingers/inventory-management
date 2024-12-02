const db = require("@db");
module.exports = class BaseCRUDService {
  constructor(modelName) {
    this[modelName] = db[modelName];
    this.modelName = modelName;
    this.sequelize = db.sequelize;
    this.db = db
    console.log("BaseCRUDService coming", modelName);
  }
  createInstance = async (params, options) => {
    try {
      return this[this.modelName].create(params, options);
    } catch (error) {
      throw error;
    }
  };
  edit = async () => {};
  delete = async () => {};
  get = async (params) => {
    try {
      return this[this.modelName].findAll(params);
    } catch (error) {
      throw error;
    }
  };
};
