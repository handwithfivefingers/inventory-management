import { ERROR } from '#/constant/message'
import { verifyToken } from '#/libs/token'
import { loadUserAuthContext } from '#/services/authenticate/userAuth'
import { IRequestLocal } from '#/types/common'
import { captureException } from '@sentry/node'
import { NextFunction, Request, Response } from 'express'

interface ITokenPayload {
  email: string
  id: number
  iat: number
  exp: number
}

/**
 * Resolves the authenticated user ONCE per request:
 * - `req.user.id/email` - identity (used by authorize)
 * - `req.user.vendorIds` - the vendors the caller owns. This is the
 *   multi-tenant scope every service MUST filter by (see utils/tenant.ts).
 * - `req.user` - convenience shape `{ id, email, vendorId }` for services
 *   that read a single primary vendor.
 */
const auth: any = async (req: IRequestLocal, res: Response, next: NextFunction) => {
  try {
    const session = req.cookies?.['session']
    if (!session) throw new Error(ERROR.UNAUTHORIZED)
    const payload = verifyToken<ITokenPayload>(session)
    if (!payload) throw new Error(ERROR.UNAUTHORIZED)
    const context = await loadUserAuthContext(payload.id)
    if (!context) throw new Error(ERROR.UNAUTHORIZED)
    req.user = {
      email: context.email,
      id: context.id,
      vendorIds: context.vendorIds,
      roles: context.roles,
      vendorId: context.vendorIds[0] ?? null
    }
    console.log('---------- Auth Guard Middleware next')

    next()
  } catch (error) {
    console.log('---------- Auth Guard Middleware catched')
    ;(error as Error & { status?: number }).status = 401
    captureException(error)
    next(error)
  }
}

export { auth }
