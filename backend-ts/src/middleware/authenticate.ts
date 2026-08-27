import { ERROR } from '#/constant/message'
import { verifyToken } from '#/libs/token'
import { loadUserAuthContext } from '#/services/authenticate/userAuth'
import { captureException } from '@sentry/node'
import { NextFunction, Request, Response } from 'express'

interface IRequest extends Request {
  locals: Record<any, any>
  user?: {
    id: number
    email: string
    vendorId: number | null
  }
}
interface ITokenPayload {
  email: string
  id: number
  iat: number
  exp: number
}

/**
 * Resolves the authenticated user ONCE per request:
 * - `req.locals.id/email` - identity (used by authorize)
 * - `req.locals.vendorIds` - the vendors the caller owns. This is the
 *   multi-tenant scope every service MUST filter by (see utils/tenant.ts).
 * - `req.user` - convenience shape `{ id, email, vendorId }` for services
 *   that read a single primary vendor.
 */
const auth: any = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const session = req.cookies?.['session']
    if (!session) throw new Error(ERROR.UNAUTHORIZED)
    const payload = verifyToken<ITokenPayload>(session)
    if (!payload) throw new Error(ERROR.UNAUTHORIZED)

    // Single cached load of user + roles + vendors (shared with authorize).
    const context = await loadUserAuthContext(payload.id)
    if (!context) throw new Error(ERROR.UNAUTHORIZED)
    req.locals = {
      email: context.email,
      id: context.id,
      vendorIds: context.vendorIds,
      roles: context.roles
    }
    req.user = {
      id: context.id,
      email: context.email,
      vendorId: context.vendorIds[0] ?? null
    }
    next()
  } catch (error) {
    ;(error as Error & { status?: number }).status = 401
    captureException(error)
    next(error)
  }
}

export { auth }
