import { beforeEach, describe, expect, it, vi } from 'vitest'

const unit = vi.hoisted(() => ({ create: vi.fn(), findOne: vi.fn(), findAndCountAll: vi.fn() }))
vi.mock('#/database/models/units', () => ({ default: unit }))

import { UnitsService } from '..'

describe('UnitsService', () => {
  const service = new UnitsService()

  beforeEach(() => vi.clearAllMocks())

  it('does not allow a caller to update a unit from another vendor', async () => {
    unit.findOne.mockResolvedValue(null)

    await expect(service.update({ id: 7, vendorId: 2, name: 'Renamed' } as any)).rejects.toThrow('Unit not found')
    expect(unit.findOne).toHaveBeenCalledWith({ where: { id: 7, vendorId: 2 } })
  })

  it('allows renaming but prevents deleting the vendor default unit', async () => {
    const protectedUnit = { isDefault: true }
    unit.findOne.mockResolvedValue(protectedUnit)

    await expect(service.delete(7, 2)).rejects.toThrow('default unit cannot be deleted')
  })
})
