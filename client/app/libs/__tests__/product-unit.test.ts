import { describe, expect, it } from 'vitest';
import { getBaseUnit, getConvertedStock, validateUnitPrices } from '../product-unit';

describe('product unit helpers', () => {
  it('selects conversion-rate-one as the base row', () => {
    expect(getBaseUnit([{ conversionRate: 12 }, { conversionRate: 1 }])?.conversionRate).toBe(1);
  });

  it('returns whole selling units and base-unit remainder', () => {
    expect(getConvertedStock(25, 12)).toEqual({ quantity: 2, remainder: 1 });
    expect(getConvertedStock(0, 1)).toEqual({ quantity: 0, remainder: 0 });
  });

  it('enforces the price ordering', () => {
    expect(validateUnitPrices(10, 9, 8).retailValid).toBe(false);
    expect(validateUnitPrices(10, 15, 16).wholesaleValid).toBe(false);
  });
});
