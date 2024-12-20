const { cacheGet, cacheSet, cacheKey } = require("@src/libs/redis");

/**
 * Cache an item by given key
 * @param {object} opts
 * @param {string} opts.key cache key
 * @param {function} opts.callback callback when cache not hit
 * @returns {Promise<any>}
 */
const providerCacheItem = async ({ key, callback }) => {
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
    console.log("error", error);
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
const providerCacheList = async ({ key, callback }) => {
  const providerKeyCaches = await cacheGet(cacheKey("Providers", "Key"));
  if (!providerKeyCaches || !providerKeyCaches[key]) {
    const result = await callback();
    await cacheSet(key, result);
    await cacheSet(cacheKey("Providers", "Key"), {
      [key]: true,
    });
    return result;
  }
  const providerCaches = await cacheGet(key);
  console.log(`Hit cache: ${key}`);
  if (providerCaches) return providerCaches;
};

module.exports = { providerCacheItem, providerCacheList };
