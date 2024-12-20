const { decodeToken } = require("@src/libs/token");
const Sentry = require("@sentry/node");
const { cacheGet, cacheKey, cacheSet } = require("@src/libs/redis");
const db = require("@db");
const auth = async (req, res, next) => {
  try {
    const cookie = req.cookies;
    const session = cookie["session"];
    if (!session) throw new Error("unauthorized");
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
      await cacheSet(cacheKey("User", payload.email), user);
    }
    if (payload) {
      req.locals = { user };
    }
    next();
  } catch (error) {
    Sentry.captureException(error);
    return res.status(403).json({ message: "unauthorized" });
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
module.exports = {
  auth,
  authUpload,
};
