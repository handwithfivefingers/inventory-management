import type { IProduct, IProductBarcode, IProductVariant } from "~/types/product";
import { formatCurrency } from "~/libs/format-currency";

const toPositivePrice = (value: unknown): number | undefined => {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : undefined;
};

export const getEffectiveProductPrice = (item: Partial<IProduct> | Partial<IProductVariant>): number =>
  getVariantRetailPrice(item as Partial<IProductVariant>) ??
  toPositivePrice(item.salePrice) ??
  toPositivePrice(item.regularPrice) ??
  toPositivePrice(item.costPrice) ??
  getVariantCostPrice(item as Partial<IProductVariant>) ??
  0;

export const getBaseBarcode = (variant: Partial<IProductVariant>): IProductBarcode | undefined =>
  variant.barcodes?.find((barcode) => barcode.isBaseUnit) ?? variant.barcodes?.[0];

export const getBarcodeRetailPrice = (barcode?: Partial<IProductBarcode>): number | undefined => {
  if (!barcode) return undefined;
  const now = Date.now();
  const promoPrice = toPositivePrice(barcode.promoPrice);
  const promoStarts = barcode.promoStartAt ? new Date(barcode.promoStartAt).getTime() : -Infinity;
  const promoEnds = barcode.promoEndAt ? new Date(barcode.promoEndAt).getTime() : Infinity;
  if (promoPrice !== undefined && now >= promoStarts && now <= promoEnds) return promoPrice;
  return toPositivePrice(barcode.retailPrice);
};

export const getVariantRetailPrice = (variant: Partial<IProductVariant>): number | undefined =>
  getBarcodeRetailPrice(getBaseBarcode(variant)) ?? toPositivePrice(variant.salePrice) ?? toPositivePrice(variant.regularPrice);

export const getVariantCostPrice = (variant: Partial<IProductVariant>): number | undefined =>
  toPositivePrice(getBaseBarcode(variant)?.costPrice) ?? toPositivePrice(variant.costPrice);

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
    salePrice: getVariantRetailPrice(firstVariant || {}) ?? product.salePrice,
    regularPrice: firstVariant?.regularPrice ?? getVariantRetailPrice(firstVariant || {}) ?? product.regularPrice,
    costPrice: firstVariant?.costPrice ?? getVariantCostPrice(firstVariant || {}) ?? product.costPrice,
    quantity: product.quantity ?? 0,
    priceFrom: Math.min(...values),
    priceTo: Math.max(...values),
  };
};
