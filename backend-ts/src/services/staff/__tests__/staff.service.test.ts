import { describe, it, expect, vi, beforeEach } from 'vitest'

// The real `#/utils` index re-exports a non-existent `./sum` module, which
// breaks the import graph. The service only uses `getPagination`, so we mock
// it here with an identical implementation (no source file is modified).
vi.mock('#/utils', () => ({
  getPagination: ({
    page,
    pageSize,
    vendorId,
    warehouseId
  }: {
    page?: number | string
    pageSize?: number | string
    vendorId?: string
    warehouseId?: string
  }) => {
    const limit = pageSize ? +pageSize : 10
    const offset = page ? (+page - 1) * limit : 0
    return { limit, offset, vendorId, warehouseId }
  }
}))
import database from '#/database'
import { StaffService } from '../index'

const makeTx = () => ({ commit: vi.fn(), rollback: vi.fn() })

describe('StaffService', () => {
  let service: StaffService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new StaffService()
    database.sequelize.transaction.mockResolvedValue(makeTx())
  })

  describe('getStaffs', () => {
    it('returns paginated staff list (happy path)', async () => {
      const resp = { rows: [{ id: 1, fullName: 'John' }], count: 1 }
      database.staff.findAndCountAll.mockResolvedValue(resp)

      const result = await service.getStaffs({ query: { page: 1, pageSize: 10 } })

      expect(result).toBe(resp)
      expect(database.staff.findAndCountAll).toHaveBeenCalledTimes(1)
      const arg = database.staff.findAndCountAll.mock.calls[0][0]
      expect(arg.where).toEqual({})
      expect(arg.distinct).toBe(true)
      expect(arg.order).toEqual([['createdAt', 'DESC']])
    })

    it('applies vendorId, status, roleId and q filters from query', async () => {
      const resp = { rows: [], count: 0 }
      database.staff.findAndCountAll.mockResolvedValue(resp)

      await service.getStaffs({
        query: { vendorId: '5', status: 'active', roleId: '2', q: 'abc' }
      })

      const where = database.staff.findAndCountAll.mock.calls[0][0].where
      expect(where.vendorId).toBe(5)
      expect(where.roleId).toBe(2)
      expect(where.status).toBe('active')
      expect(where.fullName).toEqual({ [require('sequelize').Op.like]: '%abc%' })
    })

    it('throws when findAndCountAll rejects (db failure)', async () => {
      database.staff.findAndCountAll.mockRejectedValue(new Error('db down'))
      await expect(service.getStaffs({ query: {} })).rejects.toThrow('db down')
    })
  })

  describe('getById', () => {
    it('returns the staff record by id (happy path)', async () => {
      const record = { id: 7, fullName: 'Jane', dataValues: { id: 7 } }
      database.staff.findByPk.mockResolvedValue(record)

      const result = await service.getById(7)

      expect(result).toBe(record)
      const callArg = database.staff.findByPk.mock.calls[0][1] as any
      expect(callArg.include).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ model: database.user }),
          expect.objectContaining({ model: database.role }),
          expect.objectContaining({ model: database.vendor })
        ])
      )
      // Warehouse is decoupled - should not be included
      expect(callArg.include).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ model: (database as any).warehouse })])
      )
    })

    it('throws when findByPk rejects (db failure)', async () => {
      database.staff.findByPk.mockRejectedValue(new Error('boom'))
      await expect(service.getById(7)).rejects.toThrow('boom')
    })
  })

  describe('create', () => {
    const mockCounterSeq = (seq: number) => {
      database.sequelize.query.mockImplementation(async (sql: string) => {
        if (String(sql).includes('LAST_INSERT_ID()')) return [[{ seq }], []]
        return [[], []]
      })
    }

    it('generates a sequential code from the atomic counter and creates the staff', async () => {
      database.staff.findOne.mockResolvedValue({ id: 3 })
      mockCounterSeq(4)
      const created = { id: 4, code: 'NV-0004', fullName: 'Tom' }
      database.staff.create.mockResolvedValue(created)

      const body = { fullName: 'Tom', vendorId: 1 }
      const result = await service.create(body)

      expect(database.sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('ON DUPLICATE KEY UPDATE seq = LAST_INSERT_ID(seq + 1)'),
        expect.objectContaining({ replacements: { scopeKey: 'staff', year: null, initial: 4 } })
      )
      expect(database.staff.create).toHaveBeenCalledWith(
        { fullName: 'Tom', vendorId: 1, code: 'NV-0004' },
        expect.objectContaining({ transaction: expect.any(Object) })
      )
      expect(result).toBe(created)
    })

    it('pads the code to four digits when the counter returns 1', async () => {
      database.staff.findOne.mockResolvedValue(null)
      mockCounterSeq(1)
      database.staff.create.mockResolvedValue({})
      await service.create({ fullName: 'X', vendorId: 1 })
      expect(database.staff.create.mock.calls[0][0].code).toBe('NV-0001')
    })

    it('retries once when the unique code index trips (ER_DUP_ENTRY)', async () => {
      database.staff.findOne.mockResolvedValue({ id: 3 })
      let call = 0
      database.sequelize.query.mockImplementation(async (sql: string) => {
        call += String(sql).includes('LAST_INSERT_ID()') ? 1 : 0
        return [[{ seq: call === 2 ? 5 : 4 }], []]
      })
      database.staff.create
        .mockRejectedValueOnce(Object.assign(new Error('dup'), { original: { code: 'ER_DUP_ENTRY' } }))
        .mockResolvedValue({ id: 5, code: 'NV-0005' })

      const result = await service.create({ fullName: 'Y', vendorId: 1 })

      expect(result.code).toBe('NV-0005')
    })

    it('throws when vendorId missing', async () => {
      await expect(service.create({ fullName: 'NoVendor' })).rejects.toThrow('vendorId is required')
    })

    it('throws when the counter rejects (db failure)', async () => {
      database.staff.findOne.mockResolvedValue(null)
      database.sequelize.query.mockRejectedValue(new Error('count fail'))
      await expect(service.create({ fullName: 'X', vendorId: 1 })).rejects.toThrow('count fail')
    })

    it('throws when create rejects (db failure)', async () => {
      database.staff.findOne.mockResolvedValue(null)
      mockCounterSeq(2)
      database.staff.create.mockRejectedValue(new Error('create fail'))
      await expect(service.create({ fullName: 'X', vendorId: 1 })).rejects.toThrow('create fail')
    })
  })

  describe('create with login provisioning', () => {
    const mockCounterSeq = (seq: number) => {
      database.sequelize.query.mockImplementation(async (sql: string) => {
        if (String(sql).includes('LAST_INSERT_ID()')) return [[{ seq }], []]
        return [[], []]
      })
    }

    const mockQueryWithRole = (opts: { seq?: number; roleId?: number | null }) => {
      const seq = opts.seq ?? 1
      database.sequelize.query.mockImplementation(async (sql: string) => {
        if (String(sql).includes('ON DUPLICATE KEY UPDATE seq = LAST_INSERT_ID(seq + 1)')) {
          return [[], []] as any
        }
        if (String(sql).includes('LAST_INSERT_ID()')) return [[{ seq }], []] as any
        if (String(sql).includes('FROM roles WHERE LOWER(name)')) {
          if (opts.roleId) return [[{ id: opts.roleId }], []] as any
          return [[], []] as any
        }
        return [[], []] as any
      })
    }

    let tx: any

    beforeEach(() => {
      tx = { commit: vi.fn(), rollback: vi.fn() }
      database.sequelize.transaction.mockResolvedValue(tx)
      if (!(database as any).user_role) (database as any).user_role = { create: vi.fn(), findOne: vi.fn() }
      if (!(database as any).role_permission) (database as any).role_permission = { create: vi.fn() }
      if (!(database.permission as any).findOrCreate) (database.permission as any).findOrCreate = vi.fn()
    })

    it('creates user + links staff.userId/vendorId/roleId (accountEmail fallback to staff.email)', async () => {
      mockQueryWithRole({ seq: 5, roleId: 10 })
      database.staff.findOne.mockResolvedValue({ id: 4 } as any)
      ;(database as any).user.findOne.mockResolvedValue(null)
      const createdUser = { id: 99, email: 'staff@example.com' }
      ;(database as any).user.create.mockResolvedValue(createdUser)
      const existingRole = { id: 10, name: 'Staff' }
      database.role.findByPk.mockResolvedValue(existingRole as any)
      const createdStaff = { id: 5, code: 'NV-0005', userId: 99 }
      database.staff.create.mockResolvedValue(createdStaff as any)

      const result = await service.create({
        fullName: 'Nguyen Van A',
        email: 'staff@example.com',
        createAccount: true,
        password: 'password123',
        vendorId: 7,
        roleId: 10
      })

      expect((database as any).user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Nguyen Van',
          lastName: 'A',
          email: 'staff@example.com',
          password: 'password123',
          nickname: 'Nguyen Van A'
        }),
        expect.objectContaining({ transaction: tx })
      )
      expect(database.sequelize.query).not.toHaveBeenCalledWith(
        expect.stringContaining('FROM roles WHERE LOWER(name)'),
        expect.anything()
      )
      expect(database.role.findByPk).toHaveBeenCalledWith(10, { transaction: tx })
      expect(database.role.create).not.toHaveBeenCalled()
      expect((database as any).permission.findOrCreate).not.toHaveBeenCalled()
      expect(database.staff.create).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'Nguyen Van A', code: 'NV-0005', userId: 99, roleId: 10, vendorId: 7 }),
        expect.objectContaining({ transaction: tx })
      )
      const staffPayload = database.staff.create.mock.calls[0][0]
      expect(staffPayload.password).toBeUndefined()
      expect(staffPayload.createAccount).toBeUndefined()
      expect(staffPayload.accountEmail).toBeUndefined()
      expect(staffPayload.warehouseId).toBeUndefined()
      expect(tx.commit).toHaveBeenCalled()
      expect(tx.rollback).not.toHaveBeenCalled()
      expect(result).toBe(createdStaff)
    })

    it('uses explicit accountEmail override and explicit roleId', async () => {
      mockCounterSeq(2)
      database.staff.findOne.mockResolvedValue(null as any)
      ;(database as any).user.findOne.mockResolvedValue(null)
      ;(database as any).user.create.mockResolvedValue({ id: 55 } as any)
      const customRole = { id: 77, name: 'CustomCashier' }
      database.role.findByPk.mockResolvedValue(customRole as any)
      database.staff.create.mockResolvedValue({ id: 1, code: 'NV-0002' } as any)

      await service.create({
        fullName: 'Tran B',
        email: 'staff2@example.com',
        createAccount: true,
        password: 'secret99',
        accountEmail: 'login@example.com',
        roleId: 77,
        vendorId: 999
      })

      expect((database as any).user.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'login@example.com' }),
        expect.any(Object)
      )
      expect(database.role.findByPk).toHaveBeenCalledWith(77, { transaction: tx })
      expect(database.role.create).not.toHaveBeenCalled()
      expect(database.staff.create).toHaveBeenCalledWith(
        expect.objectContaining({ roleId: 77, userId: 55, vendorId: 999 }),
        expect.objectContaining({ transaction: tx })
      )
    })

    it('throws when roleId missing for account creation', async () => {
      database.staff.findOne.mockResolvedValue(null as any)
      await expect(
        service.create({
          vendorId: 1,
          fullName: 'Le C',
          email: 'le@example.com',
          createAccount: true,
          password: 'abcdef123'
        })
      ).rejects.toThrow('roleId is required')
      expect(tx.rollback).toHaveBeenCalled()
    })

    it('implicitly provisions when password present without createAccount flag', async () => {
      mockQueryWithRole({ seq: 3, roleId: 10 })
      database.staff.findOne.mockResolvedValue({ id: 2 } as any)
      ;(database as any).user.findOne.mockResolvedValue(null)
      ;(database as any).user.create.mockResolvedValue({ id: 101 } as any)
      database.role.findByPk.mockResolvedValue({ id: 10 } as any)
      ;(database as any).user_role.create.mockResolvedValue({} as any)
      database.staff.create.mockResolvedValue({ id: 3, code: 'NV-0003' } as any)

      await service.create({
        vendorId: 1,
        fullName: 'Implicit User',
        email: 'implicit@example.com',
        password: 'longenough',
        roleId: 10
      })

      expect((database as any).user.create).toHaveBeenCalledTimes(1)
      expect(tx.commit).toHaveBeenCalled()
    })

    it('does NOT provision when createAccount false and no password', async () => {
      mockCounterSeq(1)
      database.staff.findOne.mockResolvedValue(null as any)
      database.staff.create.mockResolvedValue({ id: 1, code: 'NV-0001' } as any)

      await service.create({ vendorId: 1, fullName: 'No Account', email: 'noacc@example.com' })

      expect((database as any).user.create).not.toHaveBeenCalled()
      expect((database as any).user_role.create).not.toHaveBeenCalled()
      expect(database.staff.create.mock.calls[0][0].userId).toBeUndefined()
      expect(database.staff.create).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'NV-0001', fullName: 'No Account' }),
        expect.any(Object)
      )
    })

    it('splits fullName correctly (single word → lastName empty)', async () => {
      mockQueryWithRole({ seq: 1, roleId: 10 })
      database.staff.findOne.mockResolvedValue(null as any)
      ;(database as any).user.findOne.mockResolvedValue(null)
      ;(database as any).user.create.mockResolvedValue({ id: 42 } as any)
      database.role.findByPk.mockResolvedValue({ id: 10 } as any)
      ;(database as any).user_role.create.mockResolvedValue({} as any)
      database.staff.create.mockResolvedValue({ id: 1, code: 'NV-0001' } as any)

      await service.create({
        vendorId: 1,
        fullName: 'Madonna',
        email: 'madonna@example.com',
        createAccount: true,
        password: 'pass1234',
        roleId: 10
      })

      expect((database as any).user.create).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Madonna', lastName: '' }),
        expect.any(Object)
      )
    })

    it('throws Email is required when createAccount but no email', async () => {
      mockCounterSeq(1)
      database.staff.findOne.mockResolvedValue(null as any)

      await expect(
        service.create({ vendorId: 1, fullName: 'No Email', createAccount: true, password: 'password123' })
      ).rejects.toThrow('Email is required to create login account')
      expect(tx.rollback).toHaveBeenCalled()
      expect(tx.commit).not.toHaveBeenCalled()
      expect(database.staff.create).not.toHaveBeenCalled()
    })

    it('throws Invalid email format', async () => {
      await expect(
        service.create({
          vendorId: 1,
          fullName: 'Bad Email',
          email: 'not-an-email',
          createAccount: true,
          password: 'password123',
          roleId: 1
        })
      ).rejects.toThrow('Invalid email format')
      expect(tx.rollback).toHaveBeenCalled()
    })

    it('throws Password must be at least 6 characters', async () => {
      await expect(
        service.create({
          vendorId: 1,
          fullName: 'Short Pass',
          email: 'a@b.com',
          createAccount: true,
          password: '123',
          roleId: 1
        })
      ).rejects.toThrow('Password must be at least 6 characters')
      expect(tx.rollback).toHaveBeenCalled()
    })

    it('throws Email already in use and rolls back', async () => {
      mockCounterSeq(1)
      database.staff.findOne.mockResolvedValue(null as any)
      ;(database as any).user.findOne.mockResolvedValue({ id: 1, email: 'dup@example.com' } as any)

      await expect(
        service.create({
          vendorId: 1,
          fullName: 'Dup',
          email: 'dup@example.com',
          createAccount: true,
          password: 'password123',
          roleId: 1
        })
      ).rejects.toThrow('Email already in use')
      expect((database as any).user.create).not.toHaveBeenCalled()
      expect(tx.rollback).toHaveBeenCalled()
      expect(tx.commit).not.toHaveBeenCalled()
    })

    it('throws Role not found when explicit roleId missing', async () => {
      mockCounterSeq(1)
      database.staff.findOne.mockResolvedValue(null as any)
      ;(database as any).user.findOne.mockResolvedValue(null)
      ;(database as any).user.create.mockResolvedValue({ id: 10 } as any)
      database.role.findByPk.mockResolvedValue(null as any)

      await expect(
        service.create({
          vendorId: 1,
          fullName: 'Bad Role',
          email: 'badrole@example.com',
          createAccount: true,
          password: 'password123',
          roleId: 9999
        })
      ).rejects.toThrow('Role not found')
      expect(tx.rollback).toHaveBeenCalled()
    })

    it('rolls back transaction when staff.create fails after user created', async () => {
      mockQueryWithRole({ seq: 1, roleId: 10 })
      database.staff.findOne.mockResolvedValue(null as any)
      ;(database as any).user.findOne.mockResolvedValue(null)
      ;(database as any).user.create.mockResolvedValue({ id: 11 } as any)
      database.role.findByPk.mockResolvedValue({ id: 10 } as any)
      ;(database as any).user_role.create.mockResolvedValue({} as any)
      database.staff.create.mockRejectedValue(new Error('staff db down'))

      await expect(
        service.create({
          vendorId: 1,
          fullName: 'Rollback',
          email: 'rollback@example.com',
          createAccount: true,
          password: 'password123',
          roleId: 10
        })
      ).rejects.toThrow('staff db down')
      expect(tx.rollback).toHaveBeenCalled()
      expect(tx.commit).not.toHaveBeenCalled()
    })

    it('passes through explicit userId without provisioning', async () => {
      mockCounterSeq(1)
      database.staff.findOne.mockResolvedValue(null as any)
      database.staff.create.mockResolvedValue({ id: 1, code: 'NV-0001', userId: 88 } as any)

      const result = await service.create({ vendorId: 1, fullName: 'Link', email: 'link@example.com', userId: 88 })

      expect(result.userId).toBe(88)
      expect((database as any).user.create).not.toHaveBeenCalled()
      expect(database.staff.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 88, vendorId: 1 }), expect.any(Object))
    })

    it('rolls back when counter query fails', async () => {
      database.staff.findOne.mockResolvedValue(null as any)
      ;(database as any).user.findOne.mockResolvedValue(null)
      ;(database as any).user.create.mockResolvedValue({ id: 1 } as any)
      database.role.findByPk.mockResolvedValue({ id: 10 } as any)
      ;(database as any).user_role.create.mockResolvedValue({} as any)
      database.sequelize.query.mockRejectedValue(new Error('counter down'))

      await expect(
        service.create({
          vendorId: 1,
          fullName: 'Counter Fail',
          email: 'counter@example.com',
          createAccount: true,
          password: 'password123',
          roleId: 10
        })
      ).rejects.toThrow()
      expect(tx.rollback).toHaveBeenCalled()
    })

    it('strips warehouseId from payload (decoupled)', async () => {
      mockCounterSeq(1)
      database.staff.findOne.mockResolvedValue(null as any)
      database.staff.create.mockResolvedValue({ id: 1, code: 'NV-0001' } as any)
      await service.create({ vendorId: 1, fullName: 'NoWarehouse', warehouseId: 999 } as any)
      expect(database.staff.create.mock.calls[0][0].warehouseId).toBeUndefined()
      expect(database.staff.create.mock.calls[0][0].vendorId).toBe(1)
    })
  })

  describe('update', () => {
    it('updates the staff and returns affected rows (happy path)', async () => {
      database.staff.update.mockResolvedValue([1])
      const result = await service.update(2, { fullName: 'New' })
      expect(database.staff.update).toHaveBeenCalledWith({ fullName: 'New' }, { where: { id: 2 } })
      expect(result).toBe(1)
    })

    it('throws when update rejects (db failure)', async () => {
      database.staff.update.mockRejectedValue(new Error('update fail'))
      await expect(service.update(2, { fullName: 'New' })).rejects.toThrow('update fail')
    })

    it('strips warehouseId on update', async () => {
      database.staff.update.mockResolvedValue([1])
      await service.update(2, { fullName: 'New', warehouseId: 5 } as any)
      const payload = database.staff.update.mock.calls[0][0]
      expect(payload.warehouseId).toBeUndefined()
    })
  })

  describe('remove', () => {
    it('destroys the staff record (happy path)', async () => {
      database.staff.destroy.mockResolvedValue(1)
      const result = await service.remove(3)
      expect(database.staff.destroy).toHaveBeenCalledWith({ where: { id: 3 } })
      expect(result).toBe(1)
    })

    it('throws when destroy rejects (db failure)', async () => {
      database.staff.destroy.mockRejectedValue(new Error('destroy fail'))
      await expect(service.remove(3)).rejects.toThrow('destroy fail')
    })
  })
})
