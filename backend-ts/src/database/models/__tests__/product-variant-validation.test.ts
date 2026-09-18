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
  it.each([1, 12])('accepts %i numeric characters', async (length) => {
    await expect(BarcodeValidation.build({ code: '1'.repeat(length) }).validate()).resolves.toBeDefined()
  })

  it.each([0, 13])('rejects %i characters', async (length) => {
    await expect(BarcodeValidation.build({ code: '1'.repeat(length) }).validate()).rejects.toThrow()
  })

  it('accepts alphanumeric barcodes', async () => {
    await expect(BarcodeValidation.build({ code: 'ABC123' }).validate()).resolves.toBeDefined()
  })

  it('accepts hyphens for manually entered barcodes', async () => {
    await expect(BarcodeValidation.build({ code: '123456789-1' }).validate()).resolves.toBeDefined()
  })

  it('allows null for an unassigned barcode', async () => {
    await expect(BarcodeValidation.build({ code: null }).validate()).resolves.toBeDefined()
  })
})
