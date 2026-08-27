import { MODULES, PermissionAction } from '#/constant/modules'

export type CrudFlag = 'C' | 'R' | 'U' | 'D'

/** Minimal shape of a permission row (per-role module grant). */
export interface IPermissionLike {
  name: string
  C?: boolean
  R?: boolean
  U?: boolean
  D?: boolean
}

/** Minimal shape of a role with its permissions attached. */
export interface IRoleLike {
  name?: string
  permissions?: IPermissionLike[]
}

/** Name of the auto-created owner role. */
export const ADMIN_ROLE_NAME = 'admin'

export const isAdminRoleName = (name?: string | null): boolean =>
  !!name && name.trim().toLowerCase() === ADMIN_ROLE_NAME

/**
 * HTTP verb -> CRUD action. `HEAD` is treated as `GET` (read-only).
 * Unknown verbs resolve to `null` (deny by default).
 */
export const resolveAction = (method: string): PermissionAction | null => {
  switch (method.toUpperCase()) {
    case 'GET':
    case 'HEAD':
    case 'OPTIONS':
      return 'R'
    case 'POST':
      return 'C'
    case 'PUT':
    case 'PATCH':
      return 'U'
    case 'DELETE':
      return 'D'
    default:
      return null
  }
}

/**
 * Exact-match permission check (no fuzzy `includes` matching - a user with
 * only the "role" module must NOT pass a check for "user").
 *
 * Admin bypass: members of the owner (`admin`) role pass every check, which
 * keeps them working even if a newly added module has not been back-filled
 * onto their role yet.
 */
export const hasPermission = (
  roles: IRoleLike[] | undefined,
  moduleName: string,
  action: PermissionAction
): boolean => {
  if (!roles?.length || !moduleName || !action) return false

  const target = moduleName.toLowerCase()

  return roles.some((role) => {
    if (isAdminRoleName(role.name)) return true
    if (!role.permissions?.length) return false

    return role.permissions.some(
      (permission) =>
        typeof permission?.name === 'string' &&
        permission.name.toLowerCase() === target &&
        permission[action] === true
    )
  })
}

/** True when any of the given roles grants `action` on ANY module. */
export const hasAnyPermission = (roles: IRoleLike[] | undefined, action: PermissionAction): boolean =>
  !!roles?.some((role) => role.permissions?.some((permission) => permission[action] === true))

/** Minimal shape of a permission row with join-table flags attached. */
export interface IPermissionJoinRow {
  id?: number
  name: string
  description?: string | null
  C?: boolean
  R?: boolean
  U?: boolean
  D?: boolean
  /** Sequelize nests through-model attributes here when included. */
  role_permission?: Partial<CrudFlags>
}

interface CrudFlags {
  C: boolean
  R: boolean
  U: boolean
  D: boolean
}

/**
 * Flatten a Sequelize role include (`permission` rows carrying nested
 * `role_permission` join attrs) into the flat `{id,name,C,R,U,D}` shape that
 * hasPermission(), the auth services and the client have always consumed.
 * Tolerant of already-flat rows so callers can pass either shape.
 */
export const flattenRolePermissions = <T extends { permissions?: IPermissionJoinRow[] }>(
  role: T | undefined | null
): IPermissionLike[] => {
  const rows = role?.permissions ?? []
  return rows.map((row) => {
    const flags = row.role_permission ?? row
    return {
      id: row.id,
      name: row.name,
      C: flags.C === true,
      R: flags.R === true,
      U: flags.U === true,
      D: flags.D === true
    }
  })
}

/**
 * Normalize any collection of roles to the flat shape expected by
 * hasPermission() - safe on plain mocks, legacy rows and Sequelize includes.
 */
export const flattenRoles = (
  roles: any[] | undefined | null
): IRoleLike[] =>
  (roles ?? []).map((role) => ({
    name: role?.name,
    permissions: flattenRolePermissions(role)
  }))

/**
 * Build the full-grant permission payload for the owner role created at
 * registration: every canonical module with all four actions enabled.
 */
export const buildFullPermissions = (): { name: string; C: boolean; R: boolean; U: boolean; D: boolean }[] =>
  MODULES.map((module) => ({ name: module.key, C: true, R: true, U: true, D: true }))

/** Modules a basic staff member can view but never modify. */
export const STAFF_READ_ONLY_MODULES = ['dashboard', 'product', 'category', 'unit', 'tag', 'warehouse'] as const

/** Modules a basic staff member works with daily (create/read/update, never delete). */
export const STAFF_CONTRIBUTE_MODULES = ['order', 'customer', 'invoice', 'shift'] as const

/**
 * Modules reserved for management: staff roles must never receive these
 * (people/role/financial administration). Kept as an explicit deny-list so a
 * new module added to MODULES cannot silently leak into the staff preset.
 */
export const STAFF_DENIED_MODULES = ['provider', 'import-order', 'financial', 'staff', 'setting', 'role'] as const

const emptyGrant = { C: false, R: false, U: false, D: false }

/**
 * Build the basic-grant permission payload for the `Staff` role: read-only
 * visibility of catalog/dashboard data plus day-to-day selling modules
 * (orders / customers / invoices / shifts). No delete anywhere and no
 * management modules - safe default for employee accounts.
 */
export const buildStaffPermissions = (): { name: string; C: boolean; R: boolean; U: boolean; D: boolean }[] => {
  const grants = new Map<string, { C: boolean; R: boolean; U: boolean; D: boolean }>()
  for (const key of STAFF_READ_ONLY_MODULES) {
    grants.set(key, { ...emptyGrant, R: true })
  }
  for (const key of STAFF_CONTRIBUTE_MODULES) {
    grants.set(key, { ...emptyGrant, C: true, R: true, U: true })
  }
  return Array.from(grants, ([name, flags]) => ({ name, ...flags }))
}

/**
 * Position -> permission preset mapping.
 * Each staff position receives a tailored set of module grants.
 * New positions fall back to buildStaffPermissions().
 */
export const POSITION_PERMISSION_MAP: Record<
  string,
  { readOnly: readonly string[]; contribute: readonly string[]; full?: readonly string[] }
> = {
  manager: {
    readOnly: [],
    contribute: [],
    full: [
      'dashboard',
      'order',
      'product',
      'customer',
      'invoice',
      'provider',
      'import-order',
      'warehouse',
      'category',
      'unit',
      'tag',
      'financial',
      'staff',
      'shift',
      'setting',
      'role'
    ] as const
  },
  cashier: {
    readOnly: ['dashboard', 'product', 'category', 'unit', 'tag', 'warehouse'] as const,
    contribute: ['order', 'customer', 'invoice', 'shift'] as const
  },
  warehouse: {
    readOnly: ['dashboard', 'category', 'unit', 'tag'] as const,
    contribute: ['product', 'warehouse', 'provider', 'import-order', 'shift'] as const
  },
  sales: {
    readOnly: ['dashboard', 'product', 'category', 'unit', 'tag', 'warehouse'] as const,
    contribute: ['order', 'customer', 'invoice'] as const
  },
  other: {
    readOnly: STAFF_READ_ONLY_MODULES,
    contribute: STAFF_CONTRIBUTE_MODULES
  }
}

export const buildPermissionsByPosition = (
  position?: string | null
): { name: string; C: boolean; R: boolean; U: boolean; D: boolean }[] => {
  const key = String(position || 'other').toLowerCase()
  const preset = POSITION_PERMISSION_MAP[key] ?? POSITION_PERMISSION_MAP['other']
  // Full preset (manager): C,R,U true for every module, D false
  if ((preset as any).full?.length) {
    return (preset as any).full.map((name: string) => ({ name, C: true, R: true, U: true, D: false }))
  }
  const grants = new Map<string, { C: boolean; R: boolean; U: boolean; D: boolean }>()
  for (const k of preset.readOnly) grants.set(k, { ...emptyGrant, R: true })
  for (const k of preset.contribute) grants.set(k, { ...emptyGrant, C: true, R: true, U: true })
  return Array.from(grants, ([name, flags]) => ({ name, ...flags }))
}
