import { loadUserAuthContext, IUserAuthContext } from '#/services/authenticate/userAuth'
import { IRequestLocal } from '#/types/common'

/**
 * Request-scoped user resolution backed by the shared short-TTL
 * `UserAuth:{userId}` cache (see services/authenticate/userAuth).
 *
 * Prefers the already-authenticated `req.user` (populated by `auth`),
 * falls back to `req.locals` for legacy callers, and finally loads the
 * cached context from Redis/DB. Never throws on cache failure — returns
 * `null` when the user cannot be resolved.
 */
export const getCtxUser = async (req: IRequestLocal): Promise<IUserAuthContext | null> => {
  try {
    const id = Number((req as any)?.user?.id ?? (req as any)?.locals?.id)
    if (Number.isFinite(id) && id > 0) {
      const cached = await loadUserAuthContext(id)
      if (cached) return cached
    }
    const fallback = (req as any)?.user ?? null
    if (fallback && Number.isFinite(Number(fallback.id))) {
      return {
        id: Number(fallback.id),
        email: String(fallback.email ?? ''),
        vendorIds: Array.isArray(fallback.vendorIds)
          ? fallback.vendorIds.map(Number).filter(Number.isFinite)
          : [],
        roles: Array.isArray(fallback.roles) ? fallback.roles : []
      }
    }
    return null
  } catch {
    return null
  }
}
