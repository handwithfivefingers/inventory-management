import { PermissionAction } from '#/constant/modules'
import { flattenRoles, hasPermission, resolveAction } from '#/libs/permission'
import { loadUserAuthContext } from '#/services/authenticate/userAuth'
import { NextFunction, Request, Response } from 'express'

interface IRequest extends Request {
  locals?: {
    id: number
    email: string
    [key: string]: any
  }
}

/**
 * Per-request authorization middleware factory.
 *
 * Must run AFTER `auth` (which populates `req.locals.id`). The user's role +
 * permissions come from the SHARED short-TTL cache (`loadUserAuthContext`),
 * so auth and authorize together hit the database at most once per TTL
 * window instead of twice per request.
 *
 * The required action is derived from the HTTP verb:
 *   GET/HEAD -> R, POST -> C, PUT/PATCH -> U, DELETE -> D
 * and can be overridden per route, e.g.:
 *   authorize('shift', { 'POST /close': 'U' })
 */
const authorize = (
  module: string,
  overrides: Record<string, PermissionAction> = {}
) => {
  if (!module) throw new Error('authorize() requires a module name')

  return async (req: IRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.locals?.id
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      // Resolve action: explicit "<METHOD> <path>" rule first, then plain
      // "<METHOD>" rule, then the default verb mapping.
      let action: PermissionAction | null = null
      for (const [pattern, mapped] of Object.entries(overrides)) {
        const [method, ...rest] = pattern.split(' ')
        if (req.method.toUpperCase() !== method.toUpperCase()) continue
        const suffix = rest.join(' ')
        if (!suffix || new RegExp(`${suffix}$`).test(req.path)) {
          action = mapped
          break
        }
      }
      action = action ?? resolveAction(req.method)

      if (!action) {
        res.status(405).json({ error: 'Method not allowed' })
        return
      }

      // Reuse the cached context loaded by `auth` when present; otherwise
      // (e.g. routes wired without `auth`) load it via the shared loader.
      const context =
        (Array.isArray(req.locals?.roles) ? ({ ...(req.locals as any) } as any) : null) ??
        (await loadUserAuthContext(userId))

      if (!context) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const roles = flattenRoles(context.roles as any)
      if (!hasPermission(roles, module, action)) {
        res.status(403).json({ error: 'Forbidden' })
        return
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

export default authorize
