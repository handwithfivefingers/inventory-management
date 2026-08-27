import { NextFunction, Request, Response } from 'express'

/**
 * Minimal fixed-window rate limiter (no external dependency).
 *
 * SECURITY: applied to /auth/login to slow brute-force attempts.
 * Keys are `<method> <ip> <account?>` so lockouts are per account+IP pair;
 * the optional `accountKey` extracts the identifier from the body.
 */

interface IRateLimitOptions {
  /** Window length in milliseconds. */
  windowMs?: number
  /** Max requests allowed per window per key. */
  max?: number
  /** Optional body field used to key per-account limits (e.g. 'email'). */
  accountKey?: string
}

interface IBucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, IBucket>()

/** Periodically drop expired buckets so the map cannot grow unbounded. */
const sweep = () => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export const rateLimit = ({ windowMs = 60_000, max = 10, accountKey }: IRateLimitOptions = {}) => {
  let lastSweep = Date.now()
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now()
    if (now - lastSweep > windowMs) {
      sweep()
      lastSweep = now
    }

    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown'
    const account = accountKey && req.body?.[accountKey] ? String(req.body[accountKey]).toLowerCase() : ''
    const key = `${req.method} ${ip}${account ? `:${account}` : ''}`

    const bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    bucket.count += 1
    if (bucket.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
      res.set('Retry-After', String(retryAfterSec))
      res.status(429).json({ error: 'Too many requests, please try again later' })
      return
    }
    next()
  }
}

/** Test helper: clear all buckets. */
export const resetRateLimitBuckets = () => buckets.clear()
