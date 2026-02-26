import Redis from '#/configs/redis'

const { cacheDel, cacheGet, cacheSet, cacheKey } = Redis

/**
 * Cache an item by given key
 * @param {object} opts
 * @param {string} opts.key cache key
 * @param {function} opts.callback callback when cache not hit
 * @returns {Promise<any>}
 */

interface ICacheItem {
  key: string
  callback: () => Promise<any>
  ttl?: number // Time to live in seconds (default: 24 hours)
}

const cacheItem = async ({ key, callback, ttl = 3600 * 24 }: ICacheItem) => {
  try {
    const data = await cacheGet(key)
    if (!data) {
      const result = await callback()
      await cacheSet(key, result, ttl)
      return result
    }
    console.log(`Hit cache: ${key}`)
    return data
  } catch (error) {
    console.log('Auth Caching Error', error)
    throw error
  }
}

export { cacheItem, cacheKey, cacheDel, cacheGet, cacheSet }
