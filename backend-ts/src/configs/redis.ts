// // const Redis = require('ioredis')
// import Redis from 'ioredis'
// const redisClient = new Redis(`redis://localhost:6379`, {
//   enableOfflineQueue: false,
//   retryStrategy: () => 5000
// })

// redisClient.on('error', (err) => {
//   console.log('Redis error ', err)
// })

// redisClient.on('connect', () => {
//   console.log('Redis connection has been established successfully')
// })

// export default redisClient

import ioredis from 'ioredis'
export class Redis {
  redis: ioredis
  constructor() {
    this.redis = new ioredis(`redis://localhost:6379`, {
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

  cacheKey = (...arg: string[]) => {
    return arg.join(':')
  }
  cacheGet = async (key: string) => {
    try {
      const data = await this.redis.get(key)
      if (!data) {
        return false
      }
      const parse = JSON.parse(data)
      return parse
    } catch (error) {
      console.log('Error', error)
      throw new Error('REDIS CACHE_ERROR')
    }
  }
  cacheDel = async (key: string) => {
    try {
      const data = await this.redis.del(key)
      if (data === null) {
        return false
      }
      return data
    } catch (error) {
      throw new Error('REDIS CACHE_ERROR')
    }
  }
  cacheSet = async (key: string, value: string | Record<string, unknown>, expired?: number | string) => {
    try {
      let data: boolean | Object | string = false
      let nextValue = value
      if (typeof nextValue === 'object') nextValue = JSON.stringify(nextValue)
      if (expired) data = await this.redis.set(key, nextValue, 'EX', expired)
      else data = await this.redis.set(key, nextValue)
      return data
    } catch (error) {
      throw new Error('REDIS CACHE_ERROR')
    }
  }
}
const redisClient: Redis = new Redis()
export default redisClient
