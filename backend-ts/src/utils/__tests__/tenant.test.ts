import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => {
  const makeModelMock = () => ({
    findOne: vi.fn(),
    findAll: vi.fn(),
    findByPk: vi.fn()
  })
  return { warehouse: makeModelMock(), sequelize: { transaction: vi.fn() } }
})

vi.mock('#/database', () => ({ default: db }))

import {
  getVendorScope,
  canAccessVendor,
  assertVendorAccess,
  vendorWhere,
  assertWarehouseAccess
} from '../tenant'
import { Op } from 'sequelize'

describe('tenant scoping helpers (S1)', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('getVendorScope', () => {
    it('returns null for requests without a scope (platform admin / non-HTTP callers)', () => {
      expect(getVendorScope({} as any)).toBeNull()
      expect(getVendorScope({ locals: {} } as any)).toBeNull()
    })

    it('returns the normalized vendor id list from req.locals', () => {
      expect(getVendorScope({ locals: { vendorIds: ['1', 2] } } as any)).toEqual([1, 2])
    })

    it('keeps an empty array as an explicit deny-all scope', () => {
      expect(getVendorScope({ locals: { vendorIds: [] } } as any)).toEqual([])
    })
  })

  describe('assertVendorAccess', () => {
    it('allows platform admins everywhere', () => {
      expect(() => assertVendorAccess(null, 999)).not.toThrow()
    })

    it('denies scoped users touching foreign vendors', () => {
      let status: number | undefined
      try {
        assertVendorAccess([1, 2], 3)
      } catch (error: any) {
        status = error.status
        expect(error.message).toMatch(/Unauthorized/)
      }
      expect(status).toBe(403)
    })

    it('denies rows without a vendorId for scoped users', () => {
      expect(() => assertVendorAccess([1], null)).toThrow(/Unauthorized/)
    })

    it('allows in-scope vendors', () => {
      expect(() => assertVendorAccess([1, 2], 2)).not.toThrow()
    })
  })

  describe('canAccessVendor', () => {
    it('treats empty scope as deny-all', () => {
      expect(canAccessVendor([], 1)).toBe(false)
    })
  })

  describe('vendorWhere', () => {
    it('passes through any requested vendorId for platform admins', () => {
      expect(vendorWhere(null, '7')).toEqual({ vendorId: 7 })
      expect(vendorWhere(null, undefined)).toEqual({})
    })

    it('scopes to the caller vendors when no filter requested', () => {
      expect(vendorWhere([4, 5])).toEqual({ vendorId: { [Op.in]: [4, 5] } })
    })

    it('rejects out-of-scope requested filters', () => {
      expect(() => vendorWhere([4, 5], '9')).toThrow(/Unauthorized vendor filter/)
    })

    it('honours in-scope requested filters exactly', () => {
      expect(vendorWhere([4, 5], '5')).toEqual({ vendorId: 5 })
    })
  })

  describe('assertWarehouseAccess', () => {
    it('resolves the warehouse vendor when owned', async () => {
      db.warehouse.findByPk.mockResolvedValue({ vendorId: 3 })
      await expect(assertWarehouseAccess('10', [3])).resolves.toBe(3)
    })

    it('throws 403 for a foreign warehouse', async () => {
      db.warehouse.findByPk.mockResolvedValue({ vendorId: 99 })
      await expect(assertWarehouseAccess('10', [3])).rejects.toThrow(/Unauthorized to access this warehouse/)
    })

    it('throws 404 when the warehouse does not exist', async () => {
      db.warehouse.findByPk.mockResolvedValue(null)
      await expect(assertWarehouseAccess('404', null)).rejects.toThrow(/not found/)
    })

    it('is a no-op without a warehouseId', async () => {
      await expect(assertWarehouseAccess(undefined, [1])).resolves.toBeNull()
      expect(db.warehouse.findByPk).not.toHaveBeenCalled()
    })
  })
})
