import { describe, expect, it } from 'vitest'
import { MODULES, MODULE_KEYS_LIST, PERMISSION_ACTIONS, getModule, isModuleKey } from '#/constant/modules'
import {
  STAFF_CONTRIBUTE_MODULES,
  STAFF_DENIED_MODULES,
  STAFF_READ_ONLY_MODULES,
  buildFullPermissions,
  buildStaffPermissions,
  hasAnyPermission,
  hasPermission,
  isAdminRoleName,
  resolveAction
} from '#/libs/permission'

describe('modules registry', () => {
  it('exposes unique module keys', () => {
    const keys = MODULES.map((m) => m.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('covers every module the routers enforce', () => {
    // Requirement 6: permissions must reflect the real codebase.
    const expected = [
      'dashboard', 'order', 'product', 'customer', 'invoice', 'provider',
      'import-order', 'warehouse', 'category', 'unit', 'tag', 'financial',
      'staff', 'shift', 'setting', 'role'
    ]
    expect(MODULE_KEYS_LIST.sort()).toEqual([...expected].sort())
  })

  it('gives every module a non-empty description and key format', () => {
    for (const m of MODULES) {
      expect(m.key).toMatch(/^[a-z-]+$/)
      expect(m.description.length).toBeGreaterThan(0)
    }
  })

  it('isModuleKey / getModule agree with the registry', () => {
    expect(isModuleKey('product')).toBe(true)
    expect(isModuleKey('products')).toBe(false) // exact keys only
    expect(isModuleKey('Admin')).toBe(false) // no more opaque permission rows
    expect(getModule('role')?.description).toContain('/roles')
  })

  it('defines exactly the 4 CRUD actions', () => {
    expect(PERMISSION_ACTIONS).toEqual(['C', 'R', 'U', 'D'])
  })
})

describe('resolveAction (HTTP verb -> CRUD)', () => {
  it('maps read verbs to R', () => {
    expect(resolveAction('GET')).toBe('R')
    expect(resolveAction('HEAD')).toBe('R')
    expect(resolveAction('OPTIONS')).toBe('R')
  })

  it('maps write verbs', () => {
    expect(resolveAction('POST')).toBe('C')
    expect(resolveAction('PUT')).toBe('U')
    expect(resolveAction('PATCH')).toBe('U')
    expect(resolveAction('DELETE')).toBe('D')
  })

  it('is case-insensitive and denies unknown verbs', () => {
    expect(resolveAction('get')).toBe('R')
    expect(resolveAction('TRACE')).toBe(null)
  })
})

describe('hasPermission (exact match + admin bypass)', () => {
  const role = (name: string, permissions: any[]) => ({ name, permissions })

  it('matches module names exactly, never by substring', () => {
    const roles = [role('Staff', [{ name: 'role', C: true, R: true, U: true, D: true }])]
    expect(hasPermission(roles, 'role', 'R')).toBe(true)
    // Old fuzzy `.includes()` logic would wrongly grant these:
    expect(hasPermission(roles, 'user', 'R')).toBe(false)
    expect(hasPermission(roles, 'ro', 'R')).toBe(false)
    expect(hasPermission(roles, 'roles', 'R')).toBe(false)
  })

  it('is action-aware', () => {
    const roles = [role('Viewer', [{ name: 'order', R: true, C: false, U: false, D: false }])]
    expect(hasPermission(roles, 'order', 'R')).toBe(true)
    expect(hasPermission(roles, 'order', 'C')).toBe(false)
    expect(hasPermission(roles, 'order', 'U')).toBe(false)
    expect(hasPermission(roles, 'order', 'D')).toBe(false)
  })

  it('grants admin role everything even without explicit permission rows', () => {
    const roles = [role('Admin', [])]
    expect(hasPermission(roles, 'product', 'D')).toBe(true)
  })

  it('treats admin name case-insensitively but not other roles', () => {
    expect(isAdminRoleName('admin')).toBe(true)
    expect(isAdminRoleName(' ADMIN ')).toBe(true)
    expect(isAdminRoleName('Administrator')).toBe(false)
    expect(isAdminRoleName(undefined)).toBe(false)
  })

  it('handles empty / malformed input safely', () => {
    expect(hasPermission(undefined, 'order', 'R')).toBe(false)
    expect(hasPermission([], 'order', 'R')).toBe(false)
    expect(hasPermission([role('Staff', undefined as any)], 'order', 'R')).toBe(false)
    expect(hasPermission([{ name: 'x' } as any], '', 'R')).toBe(false)
  })
})

describe('buildFullPermissions', () => {
  it('creates an all-CRUD row for every canonical module', () => {
    const full = buildFullPermissions()
    expect(full.map((p) => p.name).sort()).toEqual(MODULE_KEYS_LIST.slice().sort())
    for (const p of full) {
      expect(p.C && p.R && p.U && p.D).toBe(true)
    }
  })
})

describe('hasAnyPermission', () => {
  it('detects a single granted action across roles', () => {
    const roles = [
      { name: 'A', permissions: [{ name: 'tag', R: true }] },
      { name: 'B', permissions: [{ name: 'unit', C: false }] }
    ]
    expect(hasAnyPermission(roles as any, 'R')).toBe(true)
    expect(hasAnyPermission(roles as any, 'D')).toBe(false)
  })
})

describe('buildStaffPermissions (basic staff preset)', () => {
  const staffPermissions = buildStaffPermissions()
  const staffRole = [{ name: 'Staff', permissions: staffPermissions }]

  it('grants read access to every read-only module and nothing else on them', () => {
    for (const key of STAFF_READ_ONLY_MODULES) {
      const row = staffPermissions.find((p) => p.name === key)
      expect(row, `missing row for ${key}`).toBeTruthy()
      expect(row!.R).toBe(true)
      expect(row!.C).toBe(false)
      expect(row!.U).toBe(false)
    }
  })

  it('grants create/read/update (never delete) on day-to-day selling modules', () => {
    for (const key of STAFF_CONTRIBUTE_MODULES) {
      const row = staffPermissions.find((p) => p.name === key)
      expect(row, `missing row for ${key}`).toBeTruthy()
      expect(row!.C && row!.R && row!.U).toBe(true)
    }
  })

  it('never grants delete on any module', () => {
    for (const row of staffPermissions) {
      expect(row.D).toBe(false)
    }
  })

  it('covers only valid canonical module keys with no duplicates or overlap', () => {
    const names = staffPermissions.map((p) => p.name)
    expect(new Set(names).size).toBe(names.length)
    for (const name of names) expect(isModuleKey(name)).toBe(true)

    const readOnly = new Set<string>(STAFF_READ_ONLY_MODULES)
    const contribute = new Set<string>(STAFF_CONTRIBUTE_MODULES)
    const denied = new Set<string>(STAFF_DENIED_MODULES)
    for (const name of names) {
      // A module must belong to exactly one bucket.
      expect([readOnly.has(name), contribute.has(name), denied.has(name)].filter(Boolean)).toHaveLength(1)
    }
    // Every granted module is accounted for; nothing was silently dropped.
    expect(names.length).toBe(readOnly.size + contribute.size)
  })

  it('denies every management module reserved for admins', () => {
    for (const key of STAFF_DENIED_MODULES) {
      for (const action of PERMISSION_ACTIONS) {
        expect(hasPermission(staffRole, key, action), `${key}:${action} must be denied`).toBe(false)
      }
    }
  })

  it('passes the real authorize() checks the app performs for staff workflows', () => {
    // Read the dashboard sidebar entry...
    expect(hasPermission(staffRole, 'dashboard', 'R')).toBe(true)
    // ...create an order at the counter...
    expect(hasPermission(staffRole, 'order', 'C')).toBe(true)
    // ...update a customer record...
    expect(hasPermission(staffRole, 'customer', 'U')).toBe(true)
    // ...open/close a shift...
    expect(hasPermission(staffRole, 'shift', 'C')).toBe(true)
    expect(hasPermission(staffRole, 'shift', 'U')).toBe(true)
    // ...but never delete data or manage roles/staff/settings.
    expect(hasPermission(staffRole, 'order', 'D')).toBe(false)
    expect(hasPermission(staffRole, 'product', 'C')).toBe(false)
    expect(hasPermission(staffRole, 'role', 'R')).toBe(false)
  })

  it('matches the plain-JS matrix duplicated in the staff seeder', async () => {
    // Seeders run via scripts/run-seeds.js as CJS without TS imports, so the
    // grant matrix is duplicated there. This test fails if they drift.
    const seederUrl = new URL('../../../seeders/20260822000001-seed-staff-users.js', import.meta.url)
    const seederModule: any = await import(seederUrl.href)
    const seeder = seederModule.default ?? seederModule
    expect(seeder.READ_ONLY).toBeDefined()
    expect(seeder.CONTRIBUTE).toBeDefined()

    expect([...seeder.READ_ONLY].sort()).toEqual([...STAFF_READ_ONLY_MODULES].sort())
    expect([...seeder.CONTRIBUTE].sort()).toEqual([...STAFF_CONTRIBUTE_MODULES].sort())

    const seededMatrix = [...seeder.READ_ONLY, ...seeder.CONTRIBUTE]
      .map((name: string) => ({ name, ...seeder.flagsFor(name) }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
    expect(seededMatrix).toEqual(
      staffPermissions.slice().sort((a, b) => a.name.localeCompare(b.name))
    )
  })
})
