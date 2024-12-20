const BaseCRUDService = require("@constant/base");
const { providerCacheItem } = require("./cache");
const { cacheKey, cacheSet } = require("@src/libs/redis");
const { retrieveFirstVendor } = require("@src/libs/utils");

module.exports = class ProviderService extends BaseCRUDService {
  constructor() {
    super("provider");
  }
  async create(req) {
    const t = await this.sequelize.transaction();
    try {
      const { ...params } = req.body;
      const vendor = retrieveFirstVendor(req);
      const p = await this.createInstance(
        { ...params, vendorId: vendor.id },
        {
          transaction: t,
        }
      );
      await t.commit();
      return {
        warehouse: p,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
  async update(req) {
    const t = await this.sequelize.transaction();
    try {
      const vendor = retrieveFirstVendor(req);
      const entry = await this.provider.findByPk(req.params.id);
      const exclude = ["id", "vendorId", "createdAt", "updatedAt"];
      for (let key in req.body) {
        if (exclude.includes(key)) continue;
        entry[key] = req.body[key];
      }
      await entry.save({ transaction: t });
      await t.commit();
      await cacheSet(cacheKey("Provider", req.params.id, vendor.id), entry);
      return entry
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
  async getProvider(params) {
    try {
      const resp = await this.get({
        where: {
          vendorId: params.vendor,
        },
      });
      return resp;
    } catch (error) {
      throw error;
    }
  }
  async getProviderById(req) {
    try {
      const vendor = retrieveFirstVendor(req);
      const resp = await providerCacheItem({
        key: cacheKey("Provider", req.params.id, vendor.id),
        callback: () =>
          this.provider.findOne({
            where: {
              id: req.params.id,
              vendorId: vendor.id,
            },
          }),
      });
      return resp;
    } catch (error) {
      throw error;
    }
  }
};
