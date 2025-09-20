const db = require("@db");
const VendorService = require("../vendor");
const WarehouseService = require("../warehouse");
const bcrypt = require("bcryptjs");
const { cacheKey, cacheSet } = require("@libs/redis");
const { cacheItem } = require("./cache");
const { ERROR } = require("@constant/message");
const { retrieveUser } = require("@src/libs/utils");
module.exports = class AuthenticateService {
  constructor() {
    this.user = db["user"];
    this.sequelize = db.sequelize;
  }
  /**
   * @function get
   * @description Get user by id
   * @param {number} id - id of user
   * @returns {Promise<Object>} user
   */
  async get(req) {
    try {
      const user = retrieveUser(req);
      if (!user) throw new Error(ERROR.USR_NOT_VALID);

      if (!user?.activeWarehouse) {
        let warehouse = user.warehouses[0];
        user.activeWarehouse = warehouse;
      }

      if (!user.vendor) {
        user.vendor = user.vendors[0];
      }

      await cacheSet(cacheKey("User", user.email), user);
      delete user.password;
      return user;
    } catch (err) {
      console.log("error", err);
      throw err;
    }
  }

  /**
   * @function login
   * @description Login user and return user object
   * @param {Object} params - Login params
   * @param {string} params.email - Email
   * @param {string} params.password - Password
   * @returns {Promise<Object>} user
   */
  async login(req) {
    try {
      const { email, password } = req.body;
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

          // Get all vendors and warehouses of user
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

      if (!user || !isMatchPassword) throw new Error("Email or Password are not valid");
      if (user?.activeWarehouse) {
        delete user.password;
        return user;
      }

      if (!user?.vendor) {
        user.vendor = user.vendors[0];
      }

      // let warehouse = undefined;
      let warehouse = user.warehouses[0];
      user.activeWarehouse = warehouse;
      await cacheSet(cacheKey("User", email), user);
      delete user.password;
      return user;
    } catch (error) {
      console.log("LOGIN ERROR >> error", error);
      throw error;
    }
  }
  /**
   * @description Register a new user
   * @param {Object} params - User params
   * @param {string} params.email - Email
   * @param {string} params.password - Password
   * @param {string} [params.vendor] - Vendor name
   * @param {string} [params.warehouse] - Warehouse name
   * @returns {Promise<Object>}
   */
  async register(params) {
    const t = await this.sequelize.transaction();
    try {
      // Hash password
      const hash_password = await bcrypt.hash(params.password, 10);
      // Create user
      const user = await this.user.create(
        {
          ...params,
          password: hash_password,
        },
        { transaction: t }
      );
      // Create role
      const role = await user.createRole(
        {
          name: "Admin",
        },
        { transaction: t }
      );
      // Create permission
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
      // Create vendor
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
      // Create warehouse
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
      await t.commit();
      const usr = user.dataValues;
      // Save user to redis
      const key = cacheKey("User", user.email);
      role.dataValues.permissions = [permission.dataValues];
      usr.roles = [role.dataValues];
      await cacheSet(key, { ...usr, vendor, warehouse: [warehouse] });
      return { user, vendor, warehouse: [warehouse] };
    } catch (error) {
      await t.rollback();
      // Check if error is caused by duplicate email
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
