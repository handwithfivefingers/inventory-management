import database from '#/database'
import redisClient from '#/configs/redis'
import { flattenRolePermissions } from '#/libs/permission'

const { cacheGet, cacheSet } = redisClient

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

export const invalidateManyUserAuthCache = async (userIds: number[]): Promise<void> => {
  const unique = Array.from(new Set(userIds.filter((id) => Number.isFinite(id))))
  if (!unique.length) return
  await Promise.all(unique.map((id) => invalidateUserAuthCache(id)))
}

export const invalidateUserAuthCache = async (userId: number): Promise<void> => {
  try {
    await redisClient.cacheDel(userAuthCacheKey(userId))
  } catch {
    // Cache invalidation is best-effort; the TTL bounds staleness anyway.
  }
}

export const invalidateUsersByRoleId = async (roleId: number): Promise<void> => {
  if (!Number.isFinite(roleId)) return
  try {
    const staffs: any[] = await (database as any).staff.findAll({
      where: { roleId },
      attributes: ['userId'],
      raw: true
    })
    let userRoleIds: number[] = []
    try {
      const rows: any[] = await (database as any).user_role.findAll({
        where: { roleId },
        attributes: ['userId'],
        raw: true
      })
      userRoleIds = rows.map((r: any) => Number(r.userId)).filter(Number.isFinite)
    } catch {
      // user_role table may not exist in new schema
    }
    const ids = [...staffs.map((s: any) => Number(s.userId)), ...userRoleIds]
    await invalidateManyUserAuthCache(ids)
  } catch {
    // best-effort
  }
}

const loadFromDatabase = async (userId: number): Promise<IUserAuthContext | null> => {
  const user: any = await database.user.findByPk(userId)
  if (!user) return null

  // Staff rows — fetch separately to avoid nested include failures during hybrid decorator migration
  let staffs: any[] = []
  try {
    staffs = await (database as any).staff.findAll({ where: { userId } } as any)
  } catch {
    staffs = []
  }

  // Roles with permissions for each staff.roleId
  const roleIds = staffs
    .map((s: any) => (s.get ? s.get('roleId') : s.roleId))
    .filter((id: any) => Number.isFinite(Number(id)))
  let roleRows: any[] = []
  if (roleIds.length) {
    try {
      roleRows = await (database as any).role.findAll({
        where: { id: roleIds },
        include: [{ model: (database as any).permission, as: 'permissions', through: { attributes: [] } } as any]
      } as any)
    } catch {
      // Fallback without permissions include if association not ready
      roleRows = await (database as any).role.findAll({ where: { id: roleIds } } as any)
    }
  }
  const roleById = new Map(roleRows.map((r: any) => [Number(r.get ? r.get('id') : r.id), r]))
  const roles = staffs
    .map((s: any) => roleById.get(Number(s.get ? s.get('roleId') : s.roleId)))
    .filter(Boolean)
    .map((role: any) => ({
      id: role.get ? role.get('id') : role.id,
      name: role.get ? role.get('name') : role.name,
      permissions: flattenRolePermissions(role)
    }))

  // Vendors owned via vendors.userId
  let ownedIds: number[] = []
  try {
    const ownedVendors: any[] = await (database as any).vendor.findAll({ where: { userId } } as any)
    ownedIds = ownedVendors.map((v: any) => Number(v.get ? v.get('id') : v.id)).filter(Number.isFinite)
  } catch {
    ownedIds = []
  }

  // Vendors via staff_vendor M:N (simple, no association needed)
  let staffVendorIds: number[] = []
  if (staffs.length) {
    try {
      const staffIds = staffs.map((s: any) => Number(s.get ? s.get('id') : s.id))
      const [rows] = (await (database as any).sequelize.query(
        `SELECT vendorId FROM staff_vendor WHERE staffId IN (:ids)`,
        { replacements: { ids: staffIds } }
      )) as any
      staffVendorIds = (rows as any[]).map((r: any) => Number(r.vendorId)).filter(Number.isFinite)
    } catch {
      // Fallback to ORM include if raw query fails (table not yet created)
      try {
        const withVendors: any[] = await (database as any).staff.findAll({
          where: { userId },
          include: [{ model: (database as any).vendor, as: 'vendors', through: { attributes: [] } } as any]
        } as any)
        staffVendorIds = withVendors
          .flatMap((s: any) => (s.vendors ?? []).map((v: any) => Number(v.get ? v.get('id') : v.id)))
          .filter(Number.isFinite)
      } catch {}
    }
  }
  const vendorIds = Array.from(new Set([...ownedIds, ...staffVendorIds]))

  return {
    id: Number(user.get ? user.get('id') : user.id),
    email: String(user.get ? user.get('email') : user.email),
    roles,
    vendorIds
  }
}

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
