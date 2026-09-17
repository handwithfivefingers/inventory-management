import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SKU_FORMAT_MESSAGE,
  assertUniqueVariantSku,
  assertValidSku,
  duplicateSkuMessage,
  isValidSku,
  normalizeSku
} from '#/utils/sku'

const db = vi.hoisted(() => {
  const productVariant: any = { findOne: vi.fn() }
  return { productVariant }
})

vi.mock('#/database/models/productVariant', () => ({
  default: db.productVariant,
  ProductVariant: db.productVariant
}))

describe('SKU validation rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('normalizeSku', () => {
    it('trims and uppercases before validation', () => {
      expect(normalizeSku('  abc-123_x ')).toBe('ABC-123_X')
    })

    it('returns empty string for missing values', () => {
      expect(normalizeSku(undefined)).toBe('')
      expect(normalizeSku(null)).toBe('')
    })
  })

  describe('assertValidSku / isValidSku', () => {
    it.each(['ABC-123', 'A_1', 'XYZ', 'AB1-C_D2', 'A'.repeat(30)])('accepts valid SKU %s', (sku) => {
      expect(isValidSku(sku)).toBe(true)
      expect(assertValidSku(sku)).toBe(sku.toUpperCase())
    })

    it('normalizes lowercase input to uppercase', () => {
      expect(assertValidSku('  ab-12 ')).toBe('AB-12')
    })

    it.each([
      'AB', // too short (< 3)
      'A'.repeat(31), // too long (> 30)
      'AB 12', // space
      'AB#12', // special char
      'AB/12',
      'AB%12',
      'AB&12',
      'ÁO-123', // accented
      'ab#1'
    ])('rejects invalid SKU %s with the spec message', (sku) => {
      expect(isValidSku(sku)).toBe(false)
      expect(() => assertValidSku(sku)).toThrowError(SKU_FORMAT_MESSAGE)
    })
  })

  describe('assertUniqueVariantSku', () => {
    it('resolves when no active variant uses the SKU', async () => {
      db.productVariant.findOne.mockResolvedValue(null)
      await expect(assertUniqueVariantSku('ABC-123')).resolves.toBeUndefined()
      expect(db.productVariant.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ skuCode: 'ABC-123' }) })
      )
    })

    it('throws a 409 with the duplicate message when the SKU is taken', async () => {
      db.productVariant.findOne.mockResolvedValue({ id: 9 })
      await expect(assertUniqueVariantSku('ABC-123')).rejects.toThrowError(duplicateSkuMessage('ABC-123'))
      try {
        await assertUniqueVariantSku('ABC-123')
      } catch (error: any) {
        expect(error.status).toBe(409)
      }
    })

    it('excludes the current variant on update', async () => {
      db.productVariant.findOne.mockResolvedValue(null)
      await assertUniqueVariantSku('ABC-123', { excludeVariantId: 7 })
      const where = db.productVariant.findOne.mock.calls[0][0].where
      expect(where.id).toBeDefined()
    })
  })
})
