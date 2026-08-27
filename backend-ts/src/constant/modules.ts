/**
 * Canonical permission module registry.
 *
 * This is the SINGLE SOURCE OF TRUTH for every module key that can appear in
 * `permissions.name`. It maps 1:1 onto the routers mounted in
 * `#/routers/index.ts`, so a role editor UI (or a sync job) can enumerate
 * exactly what the backend enforces - no free-form permission names.
 *
 * Each module supports the 4 standard actions: C(reate) / R(ead) / U(pdate) /
 * D(elete). The HTTP-verb -> action mapping used by the authorize middleware
 * lives in `#/libs/permission`.
 */
export type PermissionAction = 'C' | 'R' | 'U' | 'D'

export const PERMISSION_ACTIONS: PermissionAction[] = ['C', 'R', 'U', 'D']

export interface IModuleDefinition {
  /** Stable key stored in `permissions.name` (also used by the client). */
  key: string
  /** Human readable explanation shown in role editors / API docs. */
  description: string
}

export const MODULES: IModuleDefinition[] = [
  { key: 'dashboard', description: 'Dashboard & statistics overview (/stats)' },
  { key: 'order', description: 'Sale orders (/orders)' },
  { key: 'product', description: 'Products, variants & attributes (/products, /history)' },
  { key: 'customer', description: 'Customers (/customers)' },
  { key: 'invoice', description: 'Invoices (/invoices)' },
  { key: 'provider', description: 'Providers / suppliers (/providers)' },
  { key: 'import-order', description: 'Import (purchase) orders (/import-order)' },
  { key: 'warehouse', description: 'Warehouses (/warehouses)' },
  { key: 'category', description: 'Product categories (/categories)' },
  { key: 'unit', description: 'Units of measure (/units)' },
  { key: 'tag', description: 'Product tags (/tags)' },
  { key: 'financial', description: 'Financial records & reports (/financial)' },
  { key: 'staff', description: 'Staff management (/staff)' },
  { key: 'shift', description: 'Shift open/close (/shift)' },
  { key: 'setting', description: 'Vendor settings (/settings)' },
  { key: 'role', description: 'Role & permission management (/roles)' }
]

/** Fast lookup set of valid module keys. */
const MODULE_KEYS: ReadonlySet<string> = new Set(MODULES.map((m) => m.key))

export const isModuleKey = (name: string): boolean => MODULE_KEYS.has(name)

export const getModule = (key: string): IModuleDefinition | undefined =>
  MODULES.find((m) => m.key === key)

export const MODULE_KEYS_LIST: string[] = Array.from(MODULE_KEYS)
