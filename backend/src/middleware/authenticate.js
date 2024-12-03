const { decodeToken } = require("@src/libs/token");

const auth = async (req, res, next) => {
  try {
    const cookie = req.cookies;
    const session = cookie["session"];
    if (!session) throw new Error("unauthorized");
    const payload = await decodeToken(session);
    console.log("payload", payload);
    if (payload.id) req.id = payload.id;
    next();
  } catch (error) {
    return res.status(403).json({ message: "unauthorized" });
  }
};

module.exports = {
  auth,
};
