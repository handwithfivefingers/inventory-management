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
