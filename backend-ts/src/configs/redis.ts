import ioredis from 'ioredis'

export class Redis {
  redis: ioredis
  constructor() {
    const url = process.env.REDIS_URL || `redis://localhost:6379`
    this.redis = new ioredis(url, {
      enableOfflineQueue: false,
      retryStrategy: () => 5000
    })
  }
  sync = () => {
    this.redis.on('error', (err) => {
      console.log('Redis error ', err)
    })
    this.redis.on('connect', () => {
      console.log('Redis connection has been established successfully')
    })
  }

  cacheKey = (...arg: Array<string | number>) => {
    return arg.map(String).join(':')
  }

  /**
   * Fail-open GET: returns `null` on miss OR on any Redis/codec error so
   * callers fall through to the database instead of 500ing.
   * Plain-string values stored by legacy callers are returned raw when
   * JSON.parse fails.
   */
  cacheGet = async <T = unknown>(key: string): Promise<T | null> => {
    try {
      const data = await this.redis.get(key)
      if (data == null) return null
      try {
        return JSON.parse(data) as T
      } catch {
        return data as unknown as T
      }
    } catch (error) {
      console.log('Redis cacheGet error', error)
      return null
    }
  }

  /**
   * Fail-open DEL: returns deleted count, `0` when Redis is unavailable.
   */
  cacheDel = async (key: string): Promise<number> => {
    try {
      const deleted = await this.redis.del(key)
      return typeof deleted === 'number' ? deleted : 0
    } catch (error) {
      console.log('Redis cacheDel error', error)
      return 0
    }
  }

  cacheDelMany = async (keys: string[]): Promise<number> => {
    if (!keys.length) return 0
    try {
      return await this.redis.del(...keys)
    } catch (error) {
      console.log('Redis cacheDelMany error', error)
      return 0
    }
  }

  /**
   * SCAN-based pattern delete (avoids blocking KEYS on large keyspaces).
   * Best-effort: returns deleted count, `0` on error.
   */
  cacheDelPattern = async (pattern: string): Promise<number> => {
    try {
      let cursor = '0'
      const matched: string[] = []
      do {
        const [next, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
        cursor = next
        if (keys.length) matched.push(...keys)
      } while (cursor !== '0')
      if (!matched.length) return 0
      return await this.cacheDelMany(matched)
    } catch (error) {
      console.log('Redis cacheDelPattern error', error)
      return 0
    }
  }

  /**
   * Fail-open SET: serializes non-string values as JSON, normalizes `expired`
   * to a positive TTL in seconds. Returns 'OK' on success, `null` on error.
   */
  cacheSet = async (key: string, value: unknown, expired?: number | string): Promise<string | null> => {
    try {
      const payload = typeof value === 'string' ? value : JSON.stringify(value)
      const ttl = expired === undefined ? NaN : Number(expired)
      if (Number.isFinite(ttl) && (ttl as number) > 0) {
        return await this.redis.set(key, payload, 'EX', Math.floor(ttl as number))
      }
      return await this.redis.set(key, payload)
    } catch (error) {
      console.log('Redis cacheSet error', error)
      return null
    }
  }
}
const redisClient: Redis = new Redis()
export default redisClient
