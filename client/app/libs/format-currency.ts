/**
 * Format currency value
 * @param value - The value to format
 * @param currency - Currency symbol (default: '₫')
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number | string | undefined | null, currency: string = '₫'): string => {
  if (value === undefined || value === null) return '0' + currency;

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) return '0' + currency;

  return new Intl.NumberFormat('vi-VN').format(numValue) + currency;
};

export interface IMoneyFormatOptions {
  /** Currency unit, e.g. 'VND', '$', 'đ' */
  unit?: string;
  /** Where the unit is placed relative to the amount */
  position?: 'prefix' | 'suffix';
}

/**
 * Format a money value using the vendor's money-unit settings
 * (unit symbol + prefix/suffix position).
 * e.g. formatWithUnit(150000, { unit: 'đ', position: 'suffix' }) -> '150.000đ'
 *      formatWithUnit(150000, { unit: '$', position: 'prefix' }) -> '$150.000'
 */
export const formatWithUnit = (
  value: number | string | undefined | null,
  { unit = '₫', position = 'suffix' }: IMoneyFormatOptions = {}
): string => {
  const formatted = formatNumber(value);
  if (!formatted) return '';
  return position === 'prefix' ? `${unit}${formatted}` : `${formatted}${unit}`;
};

/**
 * Format number with thousand separators
 * @param value - The value to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null) return '0';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0';
  
  return new Intl.NumberFormat('vi-VN').format(numValue);
};
