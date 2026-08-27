import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the database layer before importing the middleware.
vi.mock('#/database', () => ({
  default: {
    user: {
      findOne: vi.fn()
    },
    role: {},
    permission: {}
  }
}))

import database from '#/database'
import authorize from '#/middleware/authorize'

const makeRes = () => {
  const res: any = { statusCode: 0, body: undefined }
  res.status = vi.fn((code: number) => {
    res.statusCode = code
    return res
  })
  res.json = vi.fn((payload: unknown) => {
    res.body = payload
    return res
  })
  return res
}

const makeReq = (method: string, path = '/', locals: any = { id: 1, email: 'a@b.c' }) =>
  ({ method, path, locals } as any)

const userWithRoles = (roles: any[]) => {
  ;(database.user.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, roles })
}

describe('authorize middleware', () => {
  let next: ReturnType<typeof vi.fn>
  let res: ReturnType<typeof makeRes>

  beforeEach(() => {
    vi.clearAllMocks()
    next = vi.fn()
    res = makeRes()
  })

  it('calls next() when the role grants the verb-derived action (GET -> R)', async () => {
    userWithRoles([{ name: 'Staff', permissions: [{ name: 'product', C: false, R: true, U: false, D: false }] }])
    await authorize('product')(makeReq('GET', '/'), res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('maps POST -> C and rejects when only R is granted', async () => {
    userWithRoles([{ name: 'Viewer', permissions: [{ name: 'order', C: false, R: true, U: false, D: false }] }])
    await authorize('order')(makeReq('POST', '/create'), res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' })
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects users with no matching permission for the module', async () => {
    userWithRoles([{ name: 'Sales', permissions: [{ name: 'customer', R: true }] }])
    await authorize('financial')(makeReq('GET', '/report'), res, next)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('lets admin pass without explicit rows', async () => {
    userWithRoles([{ name: 'Admin', permissions: [] }])
    await authorize('setting')(makeReq('PUT', '/'), res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('returns 401 without an authenticated user in locals', async () => {
    await authorize('order')(makeReq('GET', '/', {}), res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(database.user.findOne).not.toHaveBeenCalled()
  })

  it('returns 401 when the user no longer exists', async () => {
    ;(database.user.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await authorize('order')(makeReq('GET', '/'), res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 405 for unmappable HTTP verbs', async () => {
    await authorize('order')(makeReq('TRACE', '/'), res, next)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  describe('action overrides', () => {
    it('applies "<VERB> <path>" overrides (shift close = U, not C)', async () => {
      userWithRoles([
        { name: 'Operator', permissions: [{ name: 'shift', C: true, R: true, U: false, D: false }] }]
      )
      const mw = authorize('shift', { 'POST /close': 'U' })

      // POST /12/close requires U which this role lacks -> 403
      await mw(makeReq('POST', '/12/close'), res, next)
      expect(res.status).toHaveBeenCalledWith(403)

      // POST /open maps to default C which is granted -> next()
      const res2 = makeRes()
      await mw(makeReq('POST', '/open'), res2, next)
      expect(res2.status).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('plain "<VERB>" overrides remap the whole verb', async () => {
      userWithRoles([{ name: 'Editor', permissions: [{ name: 'tag', C: false, R: true, U: true, D: false }] }])
      await authorize('tag', { POST: 'U' })(makeReq('POST', '/'), res, next)
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  it('propagates unexpected errors to next(error)', async () => {
    ;(database.user.findOne as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db down'))
    await authorize('order')(makeReq('GET', '/'), res, next)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})
