import Redis from '#/configs/redis'

const { cacheDel, cacheGet, cacheSet, cacheKey } = Redis

/**
 * Cache an item by given key
 * @param {object} opts
 * @param {string} opts.key cache key
 * @param {function} opts.callback callback when cache not hit
 * @returns {Promise<any>}
 */

interface CacheItem<T> {
  key: string
  callback: () => Promise<T>
  /**
   * @description TTL in second
   * @description default 24h
   */
  ttl?: number
}

const cacheItem = async <T>({ key, callback, ttl = 3600 * 24 }: CacheItem<T>) => {
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
    console.log('Caching Error', error)
    throw error
  }
}

export { cacheItem, cacheKey, cacheDel, cacheGet, cacheSet }
