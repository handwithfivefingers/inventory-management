import { describe, expect, it } from 'vitest'
import { sanitizePermissions } from '#/services/role'
import { MODULES } from '#/constant/modules'

describe('sanitizePermissions', () => {
  it('normalizes module keys to lowercase canonical form', () => {
    const result = sanitizePermissions([{ name: 'PRODUCT', C: true, R: true, U: false, D: false }])
    expect(result[0].name).toBe('product')
  })

  it('clamps CRUD flags to strict booleans', () => {
    const result = sanitizePermissions([
      { name: 'order', C: 'yes' as any, R: 1 as any, U: undefined as any, D: false }
    ])
    expect(result[0]).toEqual({ name: 'order', description: expect.any(String), C: false, R: false, U: false, D: false })
    // "yes" is truthy but not === true -> clamped to false (strict contract).
  })

  it('rejects unknown / legacy module keys', () => {
    expect(() =>
      sanitizePermissions([{ name: 'user', C: true, R: true, U: true, D: true }])
    ).toThrow(/Unknown permission module "user"/)
    expect(() =>
      sanitizePermissions([{ name: '', C: true, R: true, U: true, D: true }])
    ).toThrow()
  })

  it('accepts every canonical module key', () => {
    const payload = MODULES.map((m) => ({ name: m.key, C: true, R: true, U: true, D: true }))
    expect(sanitizePermissions(payload)).toHaveLength(MODULES.length)
  })

  it('returns an empty array for missing input', () => {
    expect(sanitizePermissions(undefined)).toEqual([])
    expect(sanitizePermissions([])).toEqual([])
  })
})
