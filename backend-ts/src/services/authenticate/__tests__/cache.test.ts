import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cacheItem, cacheKey } from '../cache'
import Redis from '#/configs/redis'

// Mock Redis
vi.mock('#/configs/redis', () => ({
  default: {
    cacheGet: vi.fn(),
    cacheSet: vi.fn(),
    cacheDel: vi.fn(),
    cacheKey: vi.fn((...args: string[]) => args.join(':'))
  }
}))

describe('Redis Cache Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('cacheKey', () => {
    it('should create cache key from arguments', () => {
      const key = cacheKey('User', 'test@example.com')
      expect(key).toBe('User:test@example.com')
    })

    it('should handle multiple arguments', () => {
      const key = cacheKey('Vendor', '123', 'Warehouse')
      expect(key).toBe('Vendor:123:Warehouse')
    })
  })

  describe('cacheItem', () => {
    it('should return cached data if available', async () => {
      const mockCachedData = { id: 1, email: 'test@example.com' }
      vi.mocked(Redis.cacheGet).mockResolvedValue(mockCachedData)

      const callback = vi.fn().mockResolvedValue({ id: 2, email: 'new@example.com' })

      const result = await cacheItem({
        key: 'User:test@example.com',
        callback
      })

      expect(result).toEqual(mockCachedData)
      expect(Redis.cacheGet).toHaveBeenCalledWith('User:test@example.com')
      expect(callback).not.toHaveBeenCalled()
      expect(Redis.cacheSet).not.toHaveBeenCalled()
    })

    it('should call callback and cache result if not cached', async () => {
      const mockNewData = { id: 2, email: 'new@example.com' }
      vi.mocked(Redis.cacheGet).mockResolvedValue(null)
      vi.mocked(Redis.cacheSet).mockResolvedValue(true as any)

      const callback = vi.fn().mockResolvedValue(mockNewData)

      const result = await cacheItem({
        key: 'User:new@example.com',
        callback
      })

      expect(result).toEqual(mockNewData)
      expect(Redis.cacheGet).toHaveBeenCalledWith('User:new@example.com')
      expect(callback).toHaveBeenCalledTimes(1)
      expect(Redis.cacheSet).toHaveBeenCalledWith(
        'User:new@example.com',
        mockNewData,
        3600 * 24
      )
    })

    it('should use custom TTL if provided', async () => {
      const mockNewData = { id: 3, email: 'custom@example.com' }
      vi.mocked(Redis.cacheGet).mockResolvedValue(null)
      vi.mocked(Redis.cacheSet).mockResolvedValue(true as any)

      const callback = vi.fn().mockResolvedValue(mockNewData)
      const customTTL = 1800 // 30 minutes

      await cacheItem({
        key: 'User:custom@example.com',
        callback,
        ttl: customTTL
      })

      expect(Redis.cacheSet).toHaveBeenCalledWith(
        'User:custom@example.com',
        mockNewData,
        customTTL
      )
    })

    it('should throw error if callback fails', async () => {
      vi.mocked(Redis.cacheGet).mockResolvedValue(null)
      
      const callback = vi.fn().mockRejectedValue(new Error('Database error'))

      await expect(
        cacheItem({
          key: 'User:error@example.com',
          callback
        })
      ).rejects.toThrow('Database error')

      expect(Redis.cacheSet).not.toHaveBeenCalled()
    })

    it('should log cache hit', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      vi.mocked(Redis.cacheGet).mockResolvedValue({ id: 1 })

      await cacheItem({
        key: 'User:hit@example.com',
        callback: vi.fn()
      })

      expect(consoleSpy).toHaveBeenCalledWith('Hit cache: User:hit@example.com')
      consoleSpy.mockRestore()
    })

    it('should log caching error', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      vi.mocked(Redis.cacheGet).mockRejectedValue(new Error('Redis error'))

      await expect(
        cacheItem({
          key: 'User:error@example.com',
          callback: vi.fn()
        })
      ).rejects.toThrow('Redis error')

      expect(consoleSpy).toHaveBeenCalledWith(
        'Auth Caching Error',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })
  })

  describe('Cache Key Patterns', () => {
    it('should use consistent key format for users', () => {
      const key1 = cacheKey('User', 'user1@example.com')
      const key2 = cacheKey('User', 'user1@example.com')
      expect(key1).toBe(key2)
    })

    it('should differentiate between different entity types', () => {
      const userKey = cacheKey('User', '123')
      const vendorKey = cacheKey('Vendor', '123')
      expect(userKey).not.toBe(vendorKey)
    })
  })
})
