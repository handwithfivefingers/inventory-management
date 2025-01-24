const jwt = require("jsonwebtoken");

const EXPIRED_TIME = 60 * 60 * 24;
const SECRET_KEY = process.env.JWT_SECRET_KEY || "secret";
const signToken = (payload) => {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: EXPIRED_TIME });
};
const decodeToken = async (token) => {
  const decoded = await jwt.decode(token, SECRET_KEY);
  if (!decoded) {
    throw new Error("Token invalid");
  }
  let now = new Date().getTime();
  if (now / 1000 > decoded.exp) {
    throw new Error("Token expired");
  }
  return decoded;
};

module.exports = { signToken, decodeToken };
