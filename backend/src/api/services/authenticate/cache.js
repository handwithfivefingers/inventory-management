const { cacheGet, cacheSet, cacheKey } = require("@src/libs/redis");

/**
 * Cache an item by given key
 * @param {object} opts
 * @param {string} opts.key cache key
 * @param {function} opts.callback callback when cache not hit
 * @returns {Promise<any>}
 */
const cacheItem = async ({ key, callback }) => {
  try {
    const data = await cacheGet(key);
    if (!data) {
      const result = await callback();
      await cacheSet(key, result, 3600 * 24);
      return result;
    }
    console.log(`Hit cache: ${key}`);
    return data;
  } catch (error) {
    console.log("error", error);
    throw new Error("Caching error");
  }
};

module.exports = { cacheItem };
