import { describe, expect, it, vi } from 'vitest'

// Sequelize CLI migrations are CommonJS by convention.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration = require('../20260918000002-create-product-barcodes')
const removalMigration = require('../20260918000004-remove-legacy-variant-barcode-prices')
const globalBaseUnitMigration = require('../20260918000005-create-global-base-unit')
const unitMetadataMigration = require('../20260918000006-remove-product-barcode-base-unit')

const queryInterface = (validation: Record<string, number>) => {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('FROM productVariants pv') && sql.includes('LIMIT 10')) return [[]]
    if (sql.includes('legacyBarcodeCount')) return [[validation]]
    return [[]]
  })
  return {
    createTable: vi.fn(),
    addIndex: vi.fn(),
    addConstraint: vi.fn(),
    dropTable: vi.fn(),
    sequelize: { query }
  }
}

describe('create-product-barcodes migration', () => {
  const Sequelize = {
    INTEGER: 'INTEGER',
    STRING: () => 'STRING',
    DECIMAL: () => 'DECIMAL',
    BOOLEAN: 'BOOLEAN',
    DATE: 'DATE',
    literal: vi.fn()
  }

  it('accepts migration only when legacy and base barcode counts match', async () => {
    const qi = queryInterface({ legacyBarcodeCount: 3, migratedBarcodeCount: 3, missingBarcodeCount: 0 })
    await expect(migration.up(qi, Sequelize)).resolves.toBeUndefined()
    expect(qi.sequelize.query).toHaveBeenCalledWith(expect.stringContaining('legacyBarcodeCount'))
  })

  it('aborts rather than losing a legacy barcode when counts do not match', async () => {
    const qi = queryInterface({ legacyBarcodeCount: 3, migratedBarcodeCount: 2, missingBarcodeCount: 1 })
    await expect(migration.up(qi, Sequelize)).rejects.toThrow('Barcode migration validation failed')
  })
})

describe('remove legacy variant barcode/prices migration', () => {
  it('blocks destructive removal unless every active variant has one base barcode', async () => {
    const qi: any = { sequelize: { query: vi.fn().mockResolvedValueOnce([[{ id: 42 }]]) } }
    await expect(removalMigration.up(qi)).rejects.toThrow('exactly one base barcode')
  })

  it('removes the old barcode index and columns only after the base-row gate passes', async () => {
    const qi: any = {
      sequelize: { query: vi.fn().mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ Column_name: 'code', Key_name: 'code' }]]) },
      removeIndex: vi.fn(), removeColumn: vi.fn(),
      describeTable: vi.fn().mockResolvedValue({ code: {}, salePrice: {}, regularPrice: {}, wholeSalePrice: {}, costPrice: {} })
    }
    await removalMigration.up(qi)
    expect(qi.removeIndex).toHaveBeenCalledWith('productVariants', 'code')
    expect(qi.removeColumn).toHaveBeenCalledTimes(5)
  })
})

describe('create global Base unit migration', () => {
  it('creates the shared fallback unit only when it is absent', async () => {
    const qi: any = { sequelize: { query: vi.fn().mockResolvedValue([[]]) }, bulkInsert: vi.fn() }
    await globalBaseUnitMigration.up(qi)
    expect(qi.bulkInsert).toHaveBeenCalledWith(
      'units',
      [expect.objectContaining({ name: 'Base unit', vendorId: null })]
    )
  })

  it('does not duplicate an existing shared fallback unit', async () => {
    const qi: any = { sequelize: { query: vi.fn().mockResolvedValue([[{ id: 1 }]]) }, bulkInsert: vi.fn() }
    await globalBaseUnitMigration.up(qi)
    expect(qi.bulkInsert).not.toHaveBeenCalled()
  })
})

describe('remove barcode base-unit flag migration', () => {
  const migrationQueryInterface = () => ({
    showIndex: vi.fn().mockResolvedValue([{ name: 'product_barcodes_one_base_per_variant' }]),
    removeIndex: vi.fn(),
    describeTable: vi.fn().mockResolvedValue({ baseVariantId: {}, conversionRate: {}, isBaseUnit: {} }),
    removeColumn: vi.fn()
  })

  it('keeps conversion rates and removes only the generated base flag/index', async () => {
    const qi: any = migrationQueryInterface()
    await unitMetadataMigration.up(qi)
    expect(qi.removeIndex).toHaveBeenCalledWith('product_barcodes', 'product_barcodes_one_base_per_variant')
    expect(qi.removeColumn.mock.calls.map((call: any[]) => call[1])).toEqual(['baseVariantId', 'isBaseUnit'])
  })
})
