import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => {
  const database: any = {
    role: { findAll: vi.fn() },
    permission: { findOrCreate: vi.fn() },
    role_permission: { create: vi.fn() },
    sequelize: {
      transaction: vi.fn(),
      query: vi.fn(),
      getQueryInterface: vi.fn()
    }
  }
  return database
})

vi.mock('#/database', () => ({ default: db }))

import PermissionSyncService from '#/services/permissionSync'
import { MODULES } from '#/constant/modules'

const makeTx = () => ({ commit: vi.fn(), rollback: vi.fn() })

describe('PermissionSyncService', () => {
  let service: InstanceType<typeof PermissionSyncService>

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PermissionSyncService()
    db.sequelize.transaction.mockResolvedValue(makeTx())
    // Default: schema already hybrid (no legacy C column).
    db.sequelize.getQueryInterface.mockReturnValue({
      describeTable: vi.fn().mockResolvedValue({ id: {}, name: {}, description: {} })
    })
  })

  describe('ensureCatalog + linkAdminRoles (sync)', () => {
    it('creates missing catalog rows and links them onto admin roles', async () => {
      // Catalog already has "order" only; admin role has no links.
      db.permission.findOrCreate.mockImplementation(({ where }: any) =>
        Promise.resolve([{ id: where.name === 'order' ? 7 : Math.random(), name: where.name }, where.name !== 'order'])
      )
      db.role.findAll.mockResolvedValue([{ id: 1, name: 'Admin', permissions: [] }])

      const result = await service.sync()

      expect(result.createdPermissions).toBe(MODULES.length - 1)
      expect(result.scannedRoles).toBe(1)
      expect(result.linkedAdminPermissions).toBe(MODULES.length)
      expect(db.role_permission.create).toHaveBeenCalledTimes(MODULES.length)
      for (const call of db.role_permission.create.mock.calls) {
        expect(call[0].C && call[0].R && call[0].U && call[0].D).toBe(true)
        expect(typeof call[0].roleId).toBe('number')
      }
    })

    it('is idempotent when catalog and admin links are complete', async () => {
      db.permission.findOrCreate.mockImplementation(({ where }: any) =>
        Promise.resolve([{ id: 1, name: where.name }, false])
      )
      db.role.findAll.mockResolvedValue([
        { id: 1, name: 'Admin', permissions: MODULES.map((m) => ({ name: m.key })) }
      ])

      const result = await service.sync()

      expect(result.createdPermissions).toBe(0)
      expect(result.linkedAdminPermissions).toBe(0)
      expect(db.role_permission.create).not.toHaveBeenCalled()
    })

    it('leaves non-admin roles untouched but counts them', async () => {
      db.permission.findOrCreate.mockImplementation(({ where }: any) =>
        Promise.resolve([{ id: 1, name: where.name }, false])
      )
      db.role.findAll.mockResolvedValue([{ id: 2, name: 'Manager', permissions: [] }])

      const result = await service.sync()

      expect(result.linkedAdminPermissions).toBe(0)
      expect(result.scannedRoles).toBe(1)
      expect(db.role_permission.create).not.toHaveBeenCalled()
    })

    it('rolls back on failure', async () => {      const tx = makeTx()
      db.sequelize.transaction.mockResolvedValue(tx)
      db.permission.findOrCreate.mockRejectedValue(new Error('db down'))

      await expect(service.sync()).rejects.toThrow('db down')
      expect(tx.rollback).toHaveBeenCalled()
      expect(tx.commit).not.toHaveBeenCalled()
    })
  })

  describe('migrateLegacyIfNeeded', () => {
    it('is a no-op when the permissions table has no legacy C column', async () => {
      expect(await service.migrateLegacyIfNeeded()).toBe(false)
      expect(db.sequelize.query).not.toHaveBeenCalled()
    })

    it('is a no-op on a fresh install (table missing)', async () => {
      db.sequelize.getQueryInterface.mockReturnValue({
        describeTable: vi.fn().mockRejectedValue(new Error('no table'))
      })
      expect(await service.migrateLegacyIfNeeded()).toBe(false)
    })

    it('migrates legacy flags and reports once', async () => {
      db.sequelize.getQueryInterface.mockReturnValue({
        describeTable: vi
          .fn()
          .mockResolvedValueOnce({ id: {}, name: {}, C: {}, R: {}, U: {}, D: {} }) // permissions (legacy)
          .mockResolvedValueOnce({ roleId: {}, permissionId: {} }) // join (no flags yet)
      })
      db.sequelize.query.mockImplementation((sql: string) => {
        if (sql.startsWith('SELECT id, name')) {
          return Promise.resolve([[{ id: 1, name: 'product', C: false, R: true, U: false, D: false }]])
        }
        if (sql.startsWith('SELECT roleId')) {
          return Promise.resolve([[{ roleId: 3, permissionId: 1, C: null, R: null, U: null, D: null }]])
        }
        return Promise.resolve([[]])
      })

      const migrated = await service.migrateLegacyIfNeeded()

      expect(migrated).toBe(true)
      const inserts = db.sequelize.query.mock.calls.filter(([sql]) => sql.startsWith('INSERT'))
      expect(inserts).toHaveLength(1)
      expect(inserts[0][1].replacements).toMatchObject({ roleId: 3, permissionId: 1, R: 1, C: 0 })
    })
  })
})

export {}
