const db = require("@db");
const VendorService = require("../vendor");
const WarehouseService = require("../warehouse");
const bcrypt = require("bcryptjs");
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
      // next(err);
      throw err;
    }
  }
  async login({ email, password }) {
    try {
      const user = await this.user.findOne({
        where: {
          email,
        },
      });
      console.log("password", password);
      console.log("user.password", user);
      const isMatchPassword = await bcrypt.compare(password, user.password);
      if (user && isMatchPassword) {
        delete user.dataValues.password;
        return user;
      }
      throw new Error("User Not found");
    } catch (error) {
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
      delete user.dataValues.password;
      await t.commit();
      return { user, role, permission, vendor, warehouse };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
};
