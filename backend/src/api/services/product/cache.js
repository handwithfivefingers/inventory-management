const { cacheGet, cacheSet, cacheKey } = require("@src/libs/redis");

/**
 * Cache an item by given key
 * @param {object} opts
 * @param {string} opts.key cache key
 * @param {function} opts.callback callback when cache not hit
 * @returns {Promise<any>}
 */
const productCacheItem = async ({ key, callback }) => {
  try {
    const data = await cacheGet(key);
    if (!data) {
      const result = await callback();
      await cacheSet(key, result);
      return result;
    }
    console.log(`Hit cache: ${key}`);
    return data;
  } catch (error) {
    throw new Error("Caching error");
  }
};

/**
 * Cache a list of items by given key
 * @param {object} opts
 * @param {string} opts.key cache key
 * @param {function} opts.callback callback when cache not hit
 * @returns {Promise<any[]>}
 */
const productCacheList = async ({ key, callback }) => {
  const productKeyCaches = await cacheGet(cacheKey("Products", "Key"));
  if (!productKeyCaches || !productKeyCaches[key]) {
    const result = await callback();
    await cacheSet(key, result);
    await cacheSet(cacheKey("Products", "Key"), {
      [key]: true,
    });
    return result;
  }
  const productCaches = await cacheGet(key);
  console.log(`Hit cache: ${key}`);
  if (productCaches) return productCaches;
};

module.exports = { productCacheItem, productCacheList };
