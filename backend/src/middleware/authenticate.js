const { decodeToken } = require("@src/libs/token");
const Sentry = require("@sentry/node");
const { cacheGet, cacheKey, cacheSet } = require("@src/libs/redis");
const db = require("@db");
const { ERROR } = require("@src/constant/message");
const auth = async (req, res, next) => {
  try {
    const cookie = req.cookies;
    console.log("cookie", req.cookies);
    const session = cookie["session"];
    if (!session) throw new Error(ERROR.UNAUTHORIZED);
    const payload = await decodeToken(session);
    const user = await cacheGet(cacheKey("User", payload.email));
    if (!user) {
      const user = await db.user.findOne({
        where: { id: payload.id },
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

      const vendors = await db.vendor.findAll({
        where: {
          userId: user.id,
        },
        include: db.warehouse,
      });

      const userCache = user.dataValues;
      const listVendors = [];
      const listWarehouse = [];
      for (let vendor of vendors.dataValues) {
        listVendors.push({ id: vendor.id, name: vendor.name });
        listWarehouse.push(...vendor.warehouse);
      }
      userCache.vendors = listVendors;
      userCache.warehouses = listWarehouse;
      await cacheSet(cacheKey("User", payload.email), userCache);
    }
    if (payload) {
      req.locals = { user };
    }
    next();
  } catch (error) {
    Sentry.captureException(error);
    return res.status(403).json({ message: ERROR.UNAUTHORIZED });
  }
};

const authUpload = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) throw new Error("unauthorized");
    const payload = await decodeToken(token);
    const user = await cacheGet(cacheKey("User", payload.email));
    if (payload) {
      req.locals = { user };
    }
    next();
  } catch (error) {
    Sentry.captureException(error);
    return res.status(403).json({ message: "unauthorized" });
  }
};

const retrieveUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) throw new Error(ERROR.UNAUTHORIZED);
    const payload = await decodeToken(token);
    const user = await cacheGet(cacheKey("User", payload.email));
    return user;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  auth,
  authUpload,
};
