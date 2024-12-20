const redisClient = require("@config/redis");

if (!redisClient.status) throw new Error("redisClient please check redis connection");

/**
 * @name cacheKey
 * @description return key string to get data in redis
 * @param string authorization
 */
const cacheKey = (...arg) => {
  return arg.join(":");
};

/**
 * @name get
 * @description check token into redis
 * @param string token
 */
const cacheGet = async (key) => {
  try {
    const data = await redisClient.get(key);
    if (!data) {
      return false;
    }
    const parse = JSON.parse(data);
    return parse;
  } catch (error) {
    console.log("Error", error);
    throw new Error("REDIS CACHE_ERROR");
  }
};

/**
 * @name del
 * @description c
 * @param string token
 */
const cacheDel = async (key) => {
  try {
    const data = await redisClient.del(key);
    if (data === null) {
      return false;
    }
    return data;
  } catch (error) {
    throw new Error("REDIS CACHE_ERROR");
  }
};

/**
 * @name set
 * @description check token into redis
 * @param string token
 */
const cacheSet = async (key, value, expired) => {
  try {
    let data = false;
    let nextValue = value;
    if (typeof nextValue === "object") nextValue = JSON.stringify(nextValue);
    if (expired) data = await redisClient.set(key, nextValue, "EX", expired);
    else data = await redisClient.set(key, nextValue);
    return data;
  } catch (error) {
    throw new Error("REDIS CACHE_ERROR");
  }
};
module.exports = {
  cacheGet,
  cacheKey,
  cacheDel,
  cacheSet,
};
