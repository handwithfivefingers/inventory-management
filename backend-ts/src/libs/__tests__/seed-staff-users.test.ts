import { beforeEach, describe, expect, it, vi } from 'vitest'
// Plain CJS seeder loaded through Vite's interop (default export holds module.exports).
// @ts-ignore: untyped CJS seeder module
import seederModule from '../../../seeders/20260820000001-seed-workspace.js'

const seeder: any = (seederModule as any).default ?? seederModule

/**
 * Fake queryInterface driven by pattern-matched SQL responses.
 * Each entry maps a SQL fragment to queued results (FIFO).
 */
const makeQueryInterface = () => {
  const routes: { match: RegExp; results: any[][] }[] = []
  const bulkInsert = vi.fn(async (_table: string, rows: any[]) => {
    // mysql2 returns [OkPacket]; simulate ids handed back per row count.
    const firstId = 1000 + bulkInsert.mock.calls.length * 100
    return rows.map((_, i) => ({ id: firstId + i }))
  })
  const rawDeletes: string[] = []

  const queryInterface: any = {
    sequelize: {
      query: vi.fn(async (sql: string) => {
        // Raw writes resolve without queued results.
        if (/^\s*(DELETE|UPDATE|INSERT)/i.test(sql)) return [[], []]
        for (let i = 0; i < routes.length; i++) {
          const route = routes[i]
          if (route.match.test(sql)) {
            if (route.results.length === 0) continue // exhausted route -> next match
            return route.results.shift()
          }
        }
        throw new Error(`unexpected SQL in test: ${sql}`)
      })
    },
    bulkInsert,
    bulkDelete: vi.fn(async (table: string, where: any) => {
      rawDeletes.push(`${table}:${JSON.stringify(where)}`)
      return 1
    })
  }

  return {
    queryInterface,
    bulkInsert,
    bulkDelete: queryInterface.bulkDelete,
    rawDeletes,
    /** Queue a SELECT result for SQL matching `match` (consumed FIFO). */
    onSelect(match: RegExp, rows: any[][]) {
      routes.push({ match, results: rows })
    }
  }
}

/**
 * Route map for the exact query order `up()` performs on an empty database.
 * Every insert is followed by a read-back SELECT (ids are never taken from
 * `bulkInsert` return values - MySQL resolves them undefined).
 */
const queueFreshUp = (ctx: ReturnType<typeof makeQueryInterface>) => {
  ctx.onSelect(/FROM roles/i, [[]]) // no Staff role (falls back to insert)
  ctx.onSelect(/FROM roles/i, [[{ id: 1, isSystem: true }]]) // read-back after insert
  ctx.onSelect(/FROM users/i, [[]]) // no staff account yet
  ctx.onSelect(/FROM users/i, [[{ id: 5 }]]) // read-back after insert
  ctx.onSelect(/FROM user_roles/i, [[]]) // no assignment yet
  ctx.onSelect(/FROM vendors/i, [[]]) // no vendor yet
  ctx.onSelect(/FROM vendors/i, [[{ id: 3 }]]) // read-back after insert
  ctx.onSelect(/FROM warehouses/i, [[]]) // no warehouse yet
}

describe('seeder 20260820000001-seed-workspace', () => {
  let ctx: ReturnType<typeof makeQueryInterface>

  beforeEach(() => {
    ctx = makeQueryInterface()
  })

  it('provisions account + workspace and reuses the permission catalog', async () => {
    queueFreshUp(ctx)
    await seeder.up(ctx.queryInterface, { QueryTypes: {} })

    const tables = ctx.bulkInsert.mock.calls.map((c: any[]) => c[0])
    expect(tables).toEqual(['roles', 'users', 'user_roles', 'vendors', 'warehouses'])

    // Grants come from the MUST-migration catalog; this seeder never touches
    // permissions or role_permissions.
    const rowCount = (table: string) =>
      ctx.bulkInsert.mock.calls
        .filter((c: any[]) => c[0] === table)
        .reduce((n: number, c: any[]) => n + c[1].length, 0)
    expect(rowCount('permissions')).toBe(0)
    expect(rowCount('role_permissions')).toBe(0)
    expect(rowCount('users')).toBe(1)
    expect(rowCount('user_roles')).toBe(1)
    expect(rowCount('vendors')).toBe(1)
    expect(rowCount('warehouses')).toBe(1)

    // Staff account credentials match the documented demo login.
    const userRow = ctx.bulkInsert.mock.calls.find((c: any[]) => c[0] === 'users')![1][0]
    expect(userRow.email).toBe('seed-staff@example.com')
    expect(userRow.password).toMatch(/^\$2[aby]\$10\$/) // bcrypt hash, never plaintext
    // users has no isActive column in the current schema.
    expect(Object.prototype.hasOwnProperty.call(userRow, 'isActive')).toBe(false)

    // Role assignment reuses the system Staff role id from the read-back.
    const userRoleRow = ctx.bulkInsert.mock.calls.find((c: any[]) => c[0] === 'user_roles')![1][0]
    expect(userRoleRow.roleId).toBe(1)
    expect(userRoleRow.userId).toBe(5)

    // Warehouse belongs to the freshly created vendor and is marked main.
    const warehouseRow = ctx.bulkInsert.mock.calls.find((c: any[]) => c[0] === 'warehouses')![1][0]
    expect(warehouseRow.isMain).toBe(true)
    expect(warehouseRow.vendorId).toBe(3) // id read back after the vendor insert
  })

  it('is idempotent: a second run inserts nothing new', async () => {
    const existing = { id: 42, isSystem: true }
    ctx.onSelect(/FROM roles/i, [[existing]])
    ctx.onSelect(/FROM users/i, [[existing]])
    ctx.onSelect(/FROM user_roles/i, [[existing]])
    ctx.onSelect(/FROM vendors/i, [[existing]])
    ctx.onSelect(/FROM warehouses/i, [[existing]])

    await seeder.up(ctx.queryInterface, { QueryTypes: {} })
    expect(ctx.bulkInsert).not.toHaveBeenCalled()
  })

  it('reuses existing role/workspace and only links the missing role assignment', async () => {
    ctx.onSelect(/FROM roles/i, [[{ id: 7, isSystem: true }]])
    ctx.onSelect(/FROM users/i, [[{ id: 42 }]])
    ctx.onSelect(/FROM user_roles/i, [[]]) // single-role policy: not assigned yet
    ctx.onSelect(/FROM vendors/i, [[{ id: 3 }]])
    ctx.onSelect(/FROM warehouses/i, [[{ id: 8 }]])

    await seeder.up(ctx.queryInterface, { QueryTypes: {} })

    expect(ctx.bulkInsert).not.toHaveBeenCalledWith('roles', expect.anything())
    expect(ctx.bulkInsert).not.toHaveBeenCalledWith('users', expect.anything())
    expect(ctx.bulkInsert).not.toHaveBeenCalledWith('vendors', expect.anything())
    expect(ctx.bulkInsert).not.toHaveBeenCalledWith('warehouses', expect.anything())
    expect(ctx.bulkInsert).toHaveBeenCalledTimes(1)
    expect(ctx.bulkInsert.mock.calls[0][0]).toBe('user_roles')
  })

  it('survives a driver whose bulkInsert resolves without usable ids', async () => {
    queueFreshUp(ctx)
    // Hostile driver: bulkInsert resolves undefined (MySQL behaviour).
    ctx.bulkInsert.mockResolvedValue(undefined as any)

    await expect(seeder.up(ctx.queryInterface, { QueryTypes: {} })).resolves.toBeUndefined()
  })

  it('down() removes the demo workspace but keeps the system Staff role', async () => {
    ctx.onSelect(/FROM users/i, [[{ id: 5 }]])
    ctx.onSelect(/FROM roles/i, [[{ id: 7, isSystem: true }]])

    await seeder.down(ctx.queryInterface, { QueryTypes: {} })

    // user_roles must be cleaned before users; the system role is untouched.
    expect(ctx.rawDeletes.map((d) => d.split(':')[0])).toEqual(['vendors', 'user_roles', 'users'])
    expect(ctx.bulkDelete).not.toHaveBeenCalledWith('role_permissions', expect.anything())
    expect(ctx.bulkDelete).not.toHaveBeenCalledWith('roles', expect.anything())
  })

  it('down() removes the Staff role when it was created by the fallback', async () => {
    ctx.onSelect(/FROM users/i, [[{ id: 5 }]])
    ctx.onSelect(/FROM roles/i, [[{ id: 7, isSystem: false }]])

    await seeder.down(ctx.queryInterface, { QueryTypes: {} })

    expect(ctx.rawDeletes.map((d) => d.split(':')[0])).toEqual([
      'vendors',
      'user_roles',
      'users',
      'role_permissions',
      'roles'
    ])
  })
})