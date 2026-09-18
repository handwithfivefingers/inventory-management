import type { IProduct, IProductVariant } from "~/types/product";
import { formatCurrency } from "~/libs/format-currency";

const toPositivePrice = (value: unknown): number | undefined => {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : undefined;
};

export const getEffectiveProductPrice = (item: Partial<IProduct> | Partial<IProductVariant>): number =>
  toPositivePrice(item.salePrice) ?? toPositivePrice(item.regularPrice) ?? toPositivePrice(item.costPrice) ?? 0;

export const getProductPriceValues = (product: IProduct): number[] => {
  if (product.priceFrom !== undefined) {
    return [product.priceFrom, product.priceTo ?? product.priceFrom];
  }
  const variants = (product.variants || []).filter((variant) => variant.isActive !== false);
  return variants.length > 0 ? variants.map(getEffectiveProductPrice) : [getEffectiveProductPrice(product)];
};

export const getProductPriceLabel = (product: IProduct): string => {
  const values = getProductPriceValues(product);
  const from = Math.min(...values);
  const to = Math.max(...values);
  return from === to ? formatCurrency(from) : `Range ${formatCurrency(from)} - ${formatCurrency(to)}`;
};

export const mapProductListRow = (product: IProduct): IProduct => {
  const variants = (product.variants || []).filter((variant) => variant.isActive !== false);
  const firstVariant = variants[0];
  const values = variants.length > 0 ? variants.map(getEffectiveProductPrice) : [getEffectiveProductPrice(product)];
  return {
    ...product,
    code: firstVariant?.code ?? product.code,
    skuCode: firstVariant?.skuCode ?? product.skuCode,
    salePrice: firstVariant?.salePrice ?? product.salePrice,
    regularPrice: firstVariant?.regularPrice ?? product.regularPrice,
    costPrice: firstVariant?.costPrice ?? product.costPrice,
    quantity: product.quantity ?? 0,
    priceFrom: Math.min(...values),
    priceTo: Math.max(...values),
  };
};
