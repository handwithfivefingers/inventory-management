import database from '#/database'
import redisClient from '#/configs/redis'
import { flattenRolePermissions } from '#/libs/permission'

const { cacheGet, cacheSet } = redisClient

/**
 * Shared per-user auth context loader.
 *
 * Roles are now stored on `staff` (staff.roleId → role → permissions) instead
 * of `user_role`. Each user may have multiple staff profiles (one per vendor);
 * the union of their roles defines the permission set. Vendors are resolved
 * from both `vendors.userId` (owner) and `staff.vendorId` (staff tenant).
 */

export interface IUserAuthContext {
  id: number
  email: string
  /** Vendor ids owned by this user (multi-tenant scope). Empty = platform account. */
  vendorIds: number[]
  /** Flattened roles with permissions, shaped like flattenRoles() expects. */
  roles: Array<{
    name?: string
    permissions?: Array<{ name: string; C?: boolean; R?: boolean; U?: boolean; D?: boolean }>
  }>
}

/** Short TTL (seconds): authorization changes propagate quickly. */
export const USER_AUTH_CACHE_TTL = 30

export const userAuthCacheKey = (userId: number) => redisClient.cacheKey('UserAuth', String(userId))

export const invalidateUserAuthCache = async (userId: number): Promise<void> => {
  try {
    await redisClient.cacheDel(userAuthCacheKey(userId))
  } catch {
    // Cache invalidation is best-effort; the TTL bounds staleness anyway.
  }
}

const loadFromDatabase = async (userId: number): Promise<IUserAuthContext | null> => {
  const includes: any[] = []
  if ((database as any).staff && (database as any).role) {
    includes.push({
      model: (database as any).staff,
      required: false,
      include: [
        {
          model: (database as any).role,
          include: [
            {
              model: (database as any).permission,
              through: { attributes: ['C', 'R', 'U', 'D'] }
            }
          ]
        }
      ]
    })
  }
  if ((database as any).vendor) {
    includes.push({ model: (database as any).vendor, attributes: ['id'] })
  }
  const user: any = await database.user.findOne({
    where: { id: userId },
    include: includes.length ? includes : undefined
  } as any)
  if (!user) return null

  const staffList: any[] = (user as any).staffs ?? (user as any).staff ?? []
  let rolesRaw2 = [(staffList as any)?.role]
  const roles = rolesRaw2.map((role: any) => ({
    id: role.id,
    name: role.name,
    permissions: flattenRolePermissions(role)
  }))

  // if (staffRoles.length === 0 && Array.isArray((user as any).roles) && (user as any).roles.length) {
  //   directRoles = (user as any).roles
  // }
  // // Legacy fallback: if no staff roles resolved, try the old user_role join
  // // directly via the join table (keeps owner registration working until a staff row exists).
  // let legacyRoles: any[] = []
  // if (staffRoles.length === 0 && directRoles.length === 0) {
  //   try {
  //     const rows: any[] = await (database as any).user_role.findAll({ where: { userId }, raw: true })
  //     if (rows?.length) {
  //       for (const row of rows) {
  //         const role: any = await database.role.findOne({
  //           where: { id: row.roleId },
  //           include: [{ model: database.permission, through: { attributes: ['C', 'R', 'U', 'D'] } }]
  //         })
  //         if (role) legacyRoles.push(role)
  //       }
  //     }
  //   } catch {}
  // }

  // const allRoles = staffRoles.length ? staffRoles : directRoles.length ? directRoles : legacyRoles

  // const vendorIdsFromUser: number[] = ((user as any).vendors ?? [])
  //   .map((v: any) => Number(v.get ? v.get('id') : v.id))
  //   .filter((id: number) => Number.isFinite(id))

  // const vendorIds = Array.from(new Set([...vendorIdsFromUser, ...staffVendorIds]))

  return {
    id: Number((user as any).id),
    email: String((user as any).email),
    roles: roles,
    vendorIds: (user as any).vendors?.map((v: any) => Number(v.get ? v.get('id') : v.id))
    // vendorIds,
    // roles: (allRoles ?? []).map((role: any) => ({
    //   name: role.get ? role.get('name') : role.name,
    //   permissions: (role.permissions ?? []).map((p: any) => ({
    //     name: p.get ? p.get('name') : p.name,
    //     C: Boolean(p.get ? p.get('C') : p.C),
    //     R: Boolean(p.get ? p.get('R') : p.R),
    //     U: Boolean(p.get ? p.get('U') : p.U),
    //     D: Boolean(p.get ? p.get('D') : p.D)
    //   }))
    // }))
  }
}

/**
 * Load the user's auth context (roles + vendors), via the short-TTL cache.
 * Returns null when the user no longer exists.
 */
export const loadUserAuthContext = async (userId: number): Promise<IUserAuthContext | null> => {
  if (!userId) return null
  const key = userAuthCacheKey(userId)
  try {
    const cached = await cacheGet(key)
    if (cached && typeof cached === 'object') {
      return cached as IUserAuthContext
    }
  } catch {
    // Redis unavailable -> fall through to the database.
  }
  const context = await loadFromDatabase(userId)
  if (context) {
    try {
      await cacheSet(key, context as unknown as Record<string, unknown>, USER_AUTH_CACHE_TTL)
    } catch {
      // Best-effort caching only.
    }
  }
  return context
}
