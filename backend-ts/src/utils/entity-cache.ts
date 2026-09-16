import { cacheDel, cacheItem, cacheSet } from '#/utils/caching'

/**
 * Centralized Entity Redis Cache helpers (Cache-Aside pattern).
 *
 * Key convention (lowercase, consistent with existing `vendor:<id>` and
 * `setting:<vendorId>` keys): `<model_name>:<id>`
 * Examples: `user:101`, `warehouse:12`, `product:55`, `role:7`, `setting:3`.
 *
 * - Read: `cacheItem` checks Redis first (Hit -> return), on Miss runs the
 *   DB callback, stores the result in Redis, then returns it.
 * - Write/Delete: callers MUST update the DB first, then `evictEntityCache`
 *   best-effort so a Redis outage never fails the write (TTL bounds staleness).
 */

/** Default TTL in seconds (24h) - matches `cacheItem` default. */
export const ENTITY_CACHE_TTL = 3600 * 24

export const entityCacheKey = (model: string, id: string | number): string => {
  return `${String(model).toLowerCase()}:${id}`
}

export const userCacheKey = (id: string | number): string => entityCacheKey('user', id)
export const warehouseCacheKey = (id: string | number): string => entityCacheKey('warehouse', id)
export const productCacheKey = (id: string | number): string => entityCacheKey('product', id)
export const roleCacheKey = (id: string | number): string => entityCacheKey('role', id)
/**
 * Setting rows are looked up by `vendorId` (their natural key), so the
 * entity key is `setting:<vendorId>` - same `<model>:<id>` shape.
 */
export const settingCacheKey = (vendorId: string | number): string => entityCacheKey('setting', vendorId)

export async function getCachedEntity<T>(
  model: string,
  id: string | number,
  loader: () => Promise<T>,
  ttl: number = ENTITY_CACHE_TTL
): Promise<T> {
  return cacheItem<T>({ key: entityCacheKey(model, id), callback: loader, ttl })
}

export async function setCachedEntity(
  model: string,
  id: string | number,
  value: unknown,
  ttl: number = ENTITY_CACHE_TTL
): Promise<void> {
  try {
    await cacheSet(entityCacheKey(model, id), value, ttl)
  } catch {
    // Best-effort: caching must never fail the request.
  }
}

export async function evictCachedEntity(model: string, id: string | number): Promise<void> {
  try {
    await cacheDel(entityCacheKey(model, id))
  } catch {
    // Best-effort: TTL bounds staleness when Redis is unavailable.
  }
}
