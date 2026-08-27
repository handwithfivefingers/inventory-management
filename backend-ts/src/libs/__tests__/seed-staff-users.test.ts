import { beforeEach, describe, expect, it, vi } from 'vitest'
// Plain CJS seeder loaded through Vite's interop (default export holds module.exports).
import seederModule from '../../../seeders/20260822000001-seed-staff-users.js'

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
        // Raw writes (DELETE ... JOIN) resolve without queued results.
        if (/^\s*(DELETE|UPDATE|INSERT)/i.test(sql)) return [[], []]
        for (let i = 0; i < routes.length; i++) {
          const route = routes[i]
          if (route.match.test(sql)) {
            if (route.results.length === 0) continue // exhausted route -> next match
            // QueryTypes.SELECT resolves to a PLAIN ROWS ARRAY.
            return route.results.shift()
          }
        }
        throw new Error(`unexpected SQL in test: ${sql}`)
      }),
      // capture raw DELETE ... JOIN statements issued via sequelize.query
      // (they go through the same `query` mock above)
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

/** Route map for the exact query order `up()` performs on an empty database.
 * Every insert is followed by a read-back SELECT (ids are never taken from
 * `bulkInsert` return values - MySQL resolves them undefined). */
const queueFreshUp = (ctx: ReturnType<typeof makeQueryInterface>) => {
  ctx.onSelect(/FROM roles/i, [[]]) // no existing Staff role
  ctx.onSelect(/FROM roles/i, [[{ id: 1 }]]) // read-back after insert
  for (let i = 0; i < 10; i++) {
    ctx.onSelect(/FROM permissions/i, [[]]) // grant row missing
    ctx.onSelect(/FROM permissions/i, [[{ id: i + 1 }]]) // read-back after insert
  }
  ctx.onSelect(/FROM role_permissions/i, [[]]) // no links yet
  ctx.onSelect(/FROM users/i, [[]]) // no staff account yet
  ctx.onSelect(/FROM users/i, [[{ id: 5 }]]) // read-back after insert
  ctx.onSelect(/FROM user_roles/i, [[]]) // no assignment yet
  ctx.onSelect(/FROM vendors/i, [[]]) // no vendor yet
  ctx.onSelect(/FROM vendors/i, [[{ id: 3 }]]) // read-back after insert
  ctx.onSelect(/FROM warehouses/i, [[]]) // no warehouse yet
}

describe('seeder 20260822000001-seed-staff-users', () => {
  let ctx: ReturnType<typeof makeQueryInterface>

  beforeEach(() => {
    ctx = makeQueryInterface()
  })

  it('provisions role + permissions + account + vendor/warehouse on a fresh database', async () => {
    queueFreshUp(ctx)
    await seeder.up(ctx.queryInterface, { QueryTypes: {}, Op: {} })

    const tables = ctx.bulkInsert.mock.calls.map((c: any[]) => c[0])
    const rowCount = (table: string) =>
      ctx.bulkInsert.mock.calls
        .filter((c: any[]) => c[0] === table)
        .reduce((n: number, c: any[]) => n + c[1].length, 0)
    expect(rowCount('roles')).toBe(1)
    expect(rowCount('permissions')).toBe(10)
    expect(rowCount('role_permissions')).toBe(10)
    expect(rowCount('users')).toBe(1)
    expect(rowCount('user_roles')).toBe(1)
    expect(rowCount('vendors')).toBe(1)
    expect(rowCount('warehouses')).toBe(1)

    // Staff account credentials match the documented demo login.
    const userRow = ctx.bulkInsert.mock.calls.find((c: any[]) => c[0] === 'users')![1][0]
    expect(userRow.email).toBe('seed-staff@example.com')
    expect(userRow.password).toMatch(/^\$2[aby]\$10\$/) // bcrypt hash, never plaintext

    // Role assignment carries exactly one role (userId column is UNIQUE).
    const userRoleRow = ctx.bulkInsert.mock.calls.find((c: any[]) => c[0] === 'user_roles')![1][0]
    expect(userRoleRow.roleId).toBeDefined()
    expect(userRoleRow.userId).toBeDefined()

    // Warehouse belongs to the freshly created vendor and is marked main.
    const warehouseRow = ctx.bulkInsert.mock.calls.find((c: any[]) => c[0] === 'warehouses')![1][0]
    expect(warehouseRow.isMain).toBe(true)
    expect(warehouseRow.vendorId).toBe(3) // id read back after the vendor insert
  })

  it('is idempotent: a second run inserts nothing new', async () => {
    // Every SELECT finds an existing row.
    const existing = { id: 42 }
    ctx.onSelect(/FROM roles/i, [[existing]])
    for (let i = 0; i < 10; i++) ctx.onSelect(/FROM permissions/i, [[existing]])
    ctx.onSelect(/FROM role_permissions/i, [[{ permissionId: 42 }]]) // all linked
    ctx.onSelect(/FROM users/i, [[existing]])
    ctx.onSelect(/FROM user_roles/i, [[existing]]) // already assigned
    ctx.onSelect(/FROM vendors/i, [[existing]])
    ctx.onSelect(/FROM warehouses/i, [[existing]])

    await seeder.up(ctx.queryInterface, { QueryTypes: {}, Op: {} })
    expect(ctx.bulkInsert).not.toHaveBeenCalled()
  })

  it('reuses an existing Staff role instead of duplicating it', async () => {
    const existingRole = { id: 7 }
    ctx.onSelect(/FROM roles/i, [[existingRole]])
    // 9 of the 10 grants already exist; "shift" is missing (insert + read-back).
    for (let i = 0; i < 9; i++) {
      ctx.onSelect(/FROM permissions/i, [[{ id: i + 1 }]])
    }
    ctx.onSelect(/FROM permissions/i, [[]])
    ctx.onSelect(/FROM permissions/i, [[{ id: 10 }]])
    ctx.onSelect(/FROM role_permissions/i, [[{ permissionId: 1 }, { permissionId: 2 }]]) // 2 of 10 linked
    ctx.onSelect(/FROM users/i, [[{ id: 5 }]])
    ctx.onSelect(/FROM user_roles/i, [[{ id: 1 }]]) // already assigned
    ctx.onSelect(/FROM vendors/i, [[{ id: 3 }]])
    ctx.onSelect(/FROM warehouses/i, [[{ id: 8 }]])

    await seeder.up(ctx.queryInterface, { QueryTypes: {}, Op: {} })

    expect(ctx.bulkInsert).not.toHaveBeenCalledWith('roles', expect.anything())
    expect(ctx.bulkInsert).not.toHaveBeenCalledWith('users', expect.anything())
    // Only the missing grants are linked, in a single batched insert.
    const linkCalls = ctx.bulkInsert.mock.calls.filter((c: any[]) => c[0] === 'role_permissions')
    expect(linkCalls).toHaveLength(1)
    const linkRows = linkCalls[0][1]
    // 8 rows: the 7 unlinked existing grants plus the freshly inserted one.
    expect(linkRows).toHaveLength(8)
    expect(linkRows.every((r: any) => r.roleId === 7)).toBe(true)
    // Already-linked permissions are never duplicated.
    const linkedIds = linkRows.map((r: any) => r.permissionId)
    expect(linkedIds).not.toContain(1)
    expect(linkedIds).not.toContain(2)
    expect(new Set(linkedIds).size).toBe(linkedIds.length)
  })

  it('survives a driver whose bulkInsert resolves without usable ids', async () => {
    ctx.onSelect(/FROM roles/i, [[]])
    ctx.onSelect(/FROM roles/i, [[{ id: 1 }]])
    for (let i = 0; i < 10; i++) {
      ctx.onSelect(/FROM permissions/i, [[]])
      ctx.onSelect(/FROM permissions/i, [[{ id: i + 1 }]])
    }
    ctx.onSelect(/FROM role_permissions/i, [[]])
    ctx.onSelect(/FROM users/i, [[]])
    ctx.onSelect(/FROM users/i, [[{ id: 5 }]])
    ctx.onSelect(/FROM user_roles/i, [[]])
    ctx.onSelect(/FROM vendors/i, [[]])
    ctx.onSelect(/FROM vendors/i, [[{ id: 3 }]])
    ctx.onSelect(/FROM warehouses/i, [[]])

    // Hostile driver: bulkInsert resolves undefined (MySQL behaviour).
    ctx.bulkInsert.mockResolvedValue(undefined)

    await expect(seeder.up(ctx.queryInterface, { QueryTypes: {}, Op: {} })).resolves.toBeUndefined()
  })

  it('down() removes joins before roles/users and only orphaned permissions', async () => {
    ctx.onSelect(/FROM users/i, [[{ id: 5 }]])
    ctx.onSelect(/FROM roles/i, [[{ id: 7 }]])

    await seeder.down(ctx.queryInterface, {
      QueryTypes: {},
      Op: { like: 'LIKE', in: 'IN' }
    })

    const deleteOrder = [
      ...ctx.rawDeletes.map((d) => d.split(':')[0]),
      ...ctx.queryInterface.sequelize.query.mock.calls
        .filter((c: any[]) => /^\s*DELETE/i.test(c[0]))
        .map(() => '(raw-delete)')
    ]

    // user_roles must be cleaned before users; role_permissions before roles.
    expect(ctx.rawDeletes.map((d) => d.split(':')[0])).toEqual([
      'vendors',
      'user_roles',
      'users',
      'role_permissions',
      'roles'
    ])
    expect(deleteOrder.length).toBeGreaterThan(0)

    // Orphan-only permission cleanup is scoped to the seeded module names.
    const permDeleteCall = ctx.queryInterface.sequelize.query.mock.calls.find((c: any[]) =>
      /DELETE p FROM permissions/i.test(c[0])
    )
    expect(permDeleteCall).toBeTruthy()
    expect(permDeleteCall![0]).toContain('rp.id IS NULL')
    expect(JSON.stringify(permDeleteCall![1])).toContain('dashboard')
    expect(JSON.stringify(permDeleteCall![1])).toContain('shift')
  })
})
