import { getModule, isModuleKey } from '#/constant/modules'

export interface IPermissionGrantInput {
  name: string
  description?: string
  C?: unknown
  R?: unknown
  U?: unknown
  D?: unknown
}

export interface ISanitizedPermission {
  name: string
  description: string
  C: boolean
  R: boolean
  U: boolean
  D: boolean
}

/** Strict boolean clamp: only `=== true` survives (truthy values like 'yes'/1 are rejected). */
const clampFlag = (value: unknown): boolean => value === true

/** Lowercase + trim the raw module key. */
const normalizeModuleKey = (raw: unknown): string => String(raw ?? '').trim().toLowerCase()

/** Resolve the canonical module definition or throw on unknown/empty keys. */
const resolveModule = (rawName: unknown): { key: string; description: string } => {
  const key = normalizeModuleKey(rawName)
  if (!key || !isModuleKey(key)) {
    throw new Error(`Unknown permission module "${String(rawName)}"`)
  }
  return { key, description: getModule(key)?.description ?? key }
}

/** Validate + normalize a single permission grant (single responsibility). */
const sanitizePermissionGrant = (grant: IPermissionGrantInput): ISanitizedPermission => {
  const { key, description } = resolveModule((grant as IPermissionGrantInput)?.name)
  return {
    name: key,
    description: (grant as IPermissionGrantInput)?.description ?? description,
    C: clampFlag((grant as IPermissionGrantInput)?.C),
    R: clampFlag((grant as IPermissionGrantInput)?.R),
    U: clampFlag((grant as IPermissionGrantInput)?.U),
    D: clampFlag((grant as IPermissionGrantInput)?.D)
  }
}

/**
 * Validate + normalize raw permission grants into the canonical
 * `{ name, description, C, R, U, D }` shape.
 *
 * - Module keys are lowercased and must exist in `#/constant/modules`.
 * - CRUD flags are clamped to strict booleans (`=== true`).
 * - Missing/nullish input yields `[]`.
 */
export const sanitizePermissions = (input?: IPermissionGrantInput[] | null): ISanitizedPermission[] => {
  if (input == null) return []
  if (!Array.isArray(input)) return []
  return input.map(sanitizePermissionGrant)
}
