import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => {
  const MODEL_METHODS = [
    'findOne',
    'findAll',
    'findAndCountAll',
    'create',
    'build',
    'update',
    'destroy',
    'findByPk',
    'count',
    'bulkCreate'
  ]
  const makeModelMock = () => {
    const m: any = {}
    for (const method of MODEL_METHODS) m[method] = vi.fn()
    return m
  }
  const database: any = {}
  for (const name of ['vendor', 'vendorHistory', 'user', 'setting', 'invoice', 'invoiceDetail']) {
    database[name] = makeModelMock()
  }
  database.sequelize = {
    transaction: vi.fn(),
    literal: vi.fn((v: any) => v),
    col: vi.fn((v: any) => v),
    query: vi.fn(),
    fn: vi.fn((...a: any[]) => a)
  }
  return database
})

vi.mock('#/database', () => ({ default: db }))
vi.mock('#/utils/caching', () => ({
  cacheDel: vi.fn(),
  cacheItem: vi.fn()
}))

import database from '#/database'
import { SettingService } from '../index'

const makeTx = () => ({ commit: vi.fn(), rollback: vi.fn() })

const makeVendorRow = (fields: Record<string, any> = {}) => {
  const data: Record<string, any> = { id: 1, name: 'Brand', userId: 9, ...fields }
  return {
    ...data,
    get: vi.fn((key?: string) => (key === undefined ? { ...data } : (data as any)[key])),
    update: vi.fn(async (patch: Record<string, any>) => {
      Object.assign(data, patch)
    })
  }
}

const activeReq = (overrides: Record<string, any> = {}) =>
  ({
    query: {},
    body: {},
    user: { id: 9, email: 'owner@x.test', vendorIds: [1, 2], vendorId: 1 },
    ...overrides
  }) as any

describe('SettingService vendor settings', () => {
  let service: SettingService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SettingService()
    database.sequelize.transaction.mockResolvedValue(makeTx())
    database.user.findByPk.mockResolvedValue(null)
  })

  describe('resolveVendorDisplayName', () => {
    it('prefers legal_name over brand name', () => {
      expect(service.resolveVendorDisplayName({ legalName: 'Legal Co', name: 'Brand' })).toBe('Legal Co')
    })

    it('falls back to name, then owner email, then INV', () => {
      expect(service.resolveVendorDisplayName({ legalName: null, name: 'Brand' })).toBe('Brand')
      expect(service.resolveVendorDisplayName({ legalName: '  ', name: '  ' }, 'owner@x.test')).toBe('owner@x.test')
      expect(service.resolveVendorDisplayName(null)).toBe('INV')
    })
  })

  describe('normalizeVendorSettingsPayload', () => {
    it('accepts snake_case keys and maps empty strings to null', () => {
      expect(
        service.normalizeVendorSettingsPayload({ legal_name: 'Legal', phone: '', tax_number: null })
      ).toEqual({ legalName: 'Legal', phone: null, taxNumber: null })
    })

    it('rejects empty name, bad email and bad series prefix', () => {
      expect(() => service.normalizeVendorSettingsPayload({ name: '  ' })).toThrow()
      expect(() => service.normalizeVendorSettingsPayload({ email: 'not-an-email' })).toThrow()
      expect(() => service.normalizeVendorSettingsPayload({ invoice_series_prefix: 'bad prefix!' })).toThrow()
    })
  })

  describe('updateVendorSettings', () => {
    it('updates the active vendor, writes audit history and never touches invoices', async () => {
      const row = makeVendorRow()
      database.vendor.findByPk.mockResolvedValue(row)

      const result = await service.updateVendorSettings(
        activeReq({ body: { vendorId: 1, legal_name: 'Legal Co', phone: '090' } }),
        { vendorId: 1, legal_name: 'Legal Co', phone: '090', bogus: 'ignored' }
      )

      expect(row.update).toHaveBeenCalledWith(
        { legalName: 'Legal Co', phone: '090' },
        expect.objectContaining({ transaction: expect.anything() })
      )
      // No mass-update / cascade path: only the single row instance is written.
      expect(database.vendor.update).not.toHaveBeenCalled()
      expect(database.invoice.update).not.toHaveBeenCalled()
      expect(database.invoiceDetail.destroy).not.toHaveBeenCalled()
      expect(database.vendorHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vendorId: 1,
          changedBy: 9,
          changes: expect.objectContaining({ after: { legalName: 'Legal Co', phone: '090' } })
        }),
        expect.anything()
      )
      expect(result.displayName).toBe('Legal Co')
    })

    it('rejects cross-vendor updates even when the id is inside the caller scope', async () => {
      await expect(
        service.updateVendorSettings(activeReq({ body: { vendorId: 2 } }), { vendorId: 2, name: 'Other' })
      ).rejects.toMatchObject({ status: 403 })
      expect(database.vendor.findByPk).not.toHaveBeenCalled()
    })

    it('rejects path/body vendor mismatch', async () => {
      await expect(service.updateVendorSettings(activeReq(), { vendorId: 1, name: 'X' }, 2)).rejects.toMatchObject({
        status: 400
      })
    })

    it('rejects empty patches and missing vendors', async () => {
      await expect(service.updateVendorSettings(activeReq(), { vendorId: 1 })).rejects.toMatchObject({ status: 400 })
      database.vendor.findByPk.mockResolvedValue(null)
      await expect(service.updateVendorSettings(activeReq(), { vendorId: 1, name: 'X' })).rejects.toMatchObject({
        status: 404
      })
    })

    it('rolls back when the row update fails', async () => {
      const tx = makeTx()
      database.sequelize.transaction.mockResolvedValue(tx)
      const row = makeVendorRow()
      row.update.mockRejectedValue(new Error('db down'))
      database.vendor.findByPk.mockResolvedValue(row)

      await expect(service.updateVendorSettings(activeReq(), { vendorId: 1, name: 'X' })).rejects.toThrow('db down')
      expect(tx.rollback).toHaveBeenCalled()
      expect(tx.commit).not.toHaveBeenCalled()
    })
  })

  describe('getVendorSettings', () => {
    it('returns the vendor with computed displayName', async () => {
      database.vendor.findByPk.mockResolvedValue(makeVendorRow({ name: 'Brand', legalName: null }))
      database.user.findByPk.mockResolvedValue({ get: (k: string) => (k === 'email' ? 'owner@x.test' : null) })

      const result = await service.getVendorSettings(activeReq({ query: { vendorId: '1' } }))
      expect(database.vendor.findByPk).toHaveBeenCalledWith(1)
      expect(result.displayName).toBe('Brand')
    })

    it('rejects out-of-scope vendors', async () => {
      await expect(service.getVendorSettings(activeReq({ query: { vendorId: '99' } }))).rejects.toMatchObject({
        status: 403
      })
    })
  })
})
