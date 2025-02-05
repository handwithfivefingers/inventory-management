const db = require("@db");
const VendorService = require("../vendor");
const WarehouseService = require("../warehouse");
const bcrypt = require("bcryptjs");
const { cacheKey, cacheSet } = require("@libs/redis");
const { cacheItem } = require("./cache");
const { ERROR } = require("@constant/message");
module.exports = class AuthenticateService {
  constructor() {
    this.user = db["user"];
    this.sequelize = db.sequelize;
  }
  async get(id) {
    try {
      const user = await this.user.findOne({
        where: {
          id,
        },
        attributes: { exclude: ["password"] },
        include: [
          {
            model: db.role,
            include: {
              model: db.permission,
            },
          },
          {
            model: db.vendor,
          },
        ],
      });
      return user;
    } catch (err) {
      throw err;
    }
  }
  async login({ email, password }) {
    try {
      const user = await cacheItem({
        key: cacheKey("User", email),
        callback: async () => {
          const usr = await this.user.findOne({
            where: { email },
            include: [
              {
                model: db.role,
                include: {
                  model: db.permission,
                },
              },
              {
                model: db.vendor,
              },
            ],
          });
          const usrCache = usr?.dataValues;
          if (!usrCache) throw new Error(ERROR.USR_NOT_VALID);
          const vendors = await db.vendor.findAll({
            where: {
              userId: usrCache?.id,
            },
            include: db.warehouse,
          });
          const listVendors = [];
          const listWarehouse = [];
          for (let vendor of vendors) {
            listVendors.push({ id: vendor.dataValues.id, name: vendor.dataValues.name });
            listWarehouse.push(...vendor.dataValues.warehouses?.map((item) => item.dataValues));
          }
          usrCache.vendors = listVendors;
          usrCache.warehouses = listWarehouse;
          return usrCache;
        },
      });
      if (!user) throw new Error(ERROR.USR_NOT_VALID);
      const isMatchPassword = await bcrypt.compare(password, user.password);
      if (user && isMatchPassword) {
        delete user.password;
        return user;
      }
    } catch (error) {
      console.log('LOGIN ERROR >> error', error);
      throw error;
    }
  }
  async register(params) {
    const t = await this.sequelize.transaction();
    try {
      const hash_password = await bcrypt.hash(params.password, 10);
      const user = await this.user.create(
        {
          ...params,
          password: hash_password,
        },
        { transaction: t }
      );
      const role = await user.createRole(
        {
          name: "Admin",
        },
        { transaction: t }
      );
      const permission = await role.createPermission(
        {
          name: "Admin",
          C: true,
          R: true,
          U: true,
          D: true,
        },
        { transaction: t }
      );
      const vendor = await new VendorService().createInstance(
        {
          name: params?.vendor || "Main Vendor",
          description: "Auto generating",
          userId: user.id,
        },
        {
          transaction: t,
        }
      );
      const warehouse = await new WarehouseService().createInstance(
        {
          name: params.warehouse || "Main Warehouse",
          vendorId: vendor.id,
          description: "Auto generating",
        },
        {
          transaction: t,
        }
      );
      // delete user.dataValues.password;
      await t.commit();
      const usr = user.dataValues;
      const key = cacheKey("User", user.email);
      role.dataValues.permissions = [permission.dataValues];
      usr.roles = [role.dataValues];

      await cacheSet(key, { ...usr, vendor, warehouse: [warehouse] });
      return { user, vendor, warehouse: [warehouse] };
    } catch (error) {
      await t.rollback();
      if (error.name === "SequelizeUniqueConstraintError") {
        throw {
          code: error.original.code,
          fields: error.fields,
        };
      }
      throw error;
    }
  }
};
