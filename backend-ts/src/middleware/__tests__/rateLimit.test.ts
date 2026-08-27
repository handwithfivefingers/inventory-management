import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rateLimit, resetRateLimitBuckets } from '../rateLimit'

const makeRes = () => {
  const res: any = { statusCode: 0, headers: {} as Record<string, string>, body: null }
  res.status = (code: number) => {
    res.statusCode = code
    return res
  }
  res.set = (k: string, v: string) => {
    res.headers[k] = v
    return res
  }
  res.json = (payload: unknown) => {
    res.body = payload
    return res
  }
  return res
}

const makeReq = (ip: string, email?: string) =>
  ({
    method: 'POST',
    ip,
    socket: { remoteAddress: ip },
    body: email ? { email } : {}
  }) as any

const next = vi.fn()

describe('login rate limiter (security #2)', () => {
  beforeEach(() => {
    resetRateLimitBuckets()
    vi.clearAllMocks()
  })

  it('allows up to max requests then returns 429 with Retry-After', () => {
    const middleware = rateLimit({ windowMs: 60_000, max: 3 })

    middleware(makeReq('1.1.1.1', 'a@x.com'), makeRes(), next)
    middleware(makeReq('1.1.1.1', 'a@x.com'), makeRes(), next)
    middleware(makeReq('1.1.1.1', 'a@x.com'), makeRes(), next)
    expect(next).toHaveBeenCalledTimes(3)

    const res = makeRes()
    middleware(makeReq('1.1.1.1', 'a@x.com'), res, next)
    expect(res.statusCode).toBe(429)
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0)
    expect(next).toHaveBeenCalledTimes(3) // not called again
  })

  it('keys limits per account so other accounts are unaffected', () => {
    const middleware = rateLimit({ windowMs: 60_000, max: 1, accountKey: 'email' })

    middleware(makeReq('2.2.2.2', 'a@x.com'), makeRes(), next)
    const resOther = makeRes()
    middleware(makeReq('2.2.2.2', 'b@x.com'), resOther, next)
    expect(next).toHaveBeenCalledTimes(2)
    expect(resOther.statusCode).toBe(0)
  })

  it('isolates different IPs', () => {
    const middleware = rateLimit({ windowMs: 60_000, max: 1, accountKey: 'email' })

    middleware(makeReq('3.3.3.3', 'a@x.com'), makeRes(), next)
    const resOtherIp = makeRes()
    middleware(makeReq('4.4.4.4', 'a@x.com'), resOtherIp, next)
    expect(resOtherIp.statusCode).toBe(0)
  })

  it('unblocks once the window expires', () => {
    vi.useFakeTimers()
    try {
      const middleware = rateLimit({ windowMs: 1000, max: 1 })
      middleware(makeReq('5.5.5.5'), makeRes(), next)
      middleware(makeReq('5.5.5.5'), makeRes(), next)
      expect(next).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(1100)
      middleware(makeReq('5.5.5.5'), makeRes(), next)
      expect(next).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
