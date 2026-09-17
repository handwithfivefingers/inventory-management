import { Model, Sequelize } from 'sequelize'
import { getAttributes } from 'sequelize-typescript/dist/model/column/attribute-service'
import { afterAll, describe, expect, it, vi } from 'vitest'

// Read the real decorator metadata, but validate through an isolated model so
// associations and the application database are never initialized or connected.
const { ProductVariant } = await vi.importActual<typeof import('../productVariant')>('../productVariant')
const attributes = getAttributes(ProductVariant.prototype)
const sequelize = new Sequelize('validation', 'unused', 'unused', { dialect: 'mysql', logging: false })
class BarcodeValidation extends Model {}
BarcodeValidation.init({ code: attributes.code }, { sequelize, timestamps: false })

afterAll(async () => sequelize.close())

describe('ProductVariant barcode column', () => {
  it.each([12, 255])('accepts %i characters', async (length) => {
    await expect(BarcodeValidation.build({ code: 'A'.repeat(length) }).validate()).resolves.toBeDefined()
  })

  it.each([0, 11, 256])('rejects %i characters', async (length) => {
    await expect(BarcodeValidation.build({ code: 'A'.repeat(length) }).validate()).rejects.toThrow()
  })

  it('allows null for an unassigned barcode', async () => {
    await expect(BarcodeValidation.build({ code: null }).validate()).resolves.toBeDefined()
  })
})
