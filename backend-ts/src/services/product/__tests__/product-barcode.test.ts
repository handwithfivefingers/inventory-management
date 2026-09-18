import { describe, expect, it } from 'vitest'
import { isBaseUnitConversion } from '../product-barcode'

describe('isBaseUnitConversion', () => {
  it('marks only conversion rate 1 as the base unit', () => {
    expect(isBaseUnitConversion(1)).toBe(true)
    expect(isBaseUnitConversion(2)).toBe(false)
    expect(isBaseUnitConversion(24)).toBe(false)
  })
})
