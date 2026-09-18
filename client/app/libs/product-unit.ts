import type { IProductBarcode } from '~/types/product';

export const getBaseUnit = <T extends Pick<IProductBarcode, 'conversionRate'>>(rows: T[] | undefined): T | undefined =>
  rows?.find((row) => Number(row.conversionRate) === 1);

export const getConvertedStock = (baseQuantity: number, conversionRate: number) => {
  const rate = Number(conversionRate);
  if (!Number.isInteger(rate) || rate <= 0) return { quantity: 0, remainder: baseQuantity };
  return { quantity: Math.floor(baseQuantity / rate), remainder: baseQuantity % rate };
};

export const validateUnitPrices = (costPrice: unknown, retailPrice: unknown, wholesalePrice: unknown) => {
  const cost = Number(costPrice), retail = Number(retailPrice), wholesale = Number(wholesalePrice);
  return {
    retailValid: !Number.isFinite(cost) || !Number.isFinite(retail) || retail >= cost,
    wholesaleValid: !Number.isFinite(wholesale) || !Number.isFinite(retail) || wholesale <= retail
  };
};
