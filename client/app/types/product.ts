import { ICategory } from "./category";
import { IVendor } from "./vendor";

export interface IProductAttributeValue {
  id: number;
  value: string;
  attributeId?: number;
  attribute?: { id: number; name: string };
}

export interface IProductAttribute {
  id: number | string;
  name: string;
  productId?: number;
  values?: IProductAttributeValue[];
}

export interface IProductVariant {
  id: number;
  productId: number;
  /** Selling units and their barcode-specific prices. */
  barcodes?: IProductBarcode[];
  skuCode: string;
  /** Legacy API responses can still expose the primary barcode as `code`. */
  code?: string;
  /**
   * Compatibility fields returned by some legacy endpoints. New barcode-aware
   * UI should derive these from `barcodes` with the helpers in product-price.
   */
  salePrice?: number;
  regularPrice?: number;
  wholeSalePrice?: number;
  costPrice?: number;
  VAT?: number | null;
  imageUrl?: string | null;
  isNegative?: boolean;
  sold?: number;
  isActive?: boolean;
  quantity?: number;
  attributeValues?: IProductAttributeValue[];
  inventories?: { id: number; warehouseId: number; quantity: number }[];
}

export interface IProductBarcode {
  id?: number;
  variantId?: number;
  barcode: string;
  unitId: number | string;
  conversionRate: number;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  promoPrice?: number | null;
  promoStartAt?: string | null;
  promoEndAt?: string | null;
  /** The base selling unit is the row whose conversionRate is exactly 1. */
  unit?: { id: number; name: string };
}

/** Input shape when creating a product with an attribute matrix */
export interface IVariantAttributeInput {
  name: string;
  values: string[];
}

export interface IProduct {
  id: number;
  documentId: string;
  createdAt: string;
  description: string;
  expiredAt: string;
  inventories: any[];
  name: string;
  publishedAt: string;
  /** @deprecated Sellable fields live on variants. Present only in adapted legacy rows. */
  code: string;
  /** @deprecated Sellable fields live on variants. Present only in adapted legacy rows. */
  skuCode: string;
  quantity?: number;
  /** @deprecated Use variants[0].salePrice / unifiedVariant.salePrice. */
  salePrice?: number;
  /** @deprecated Use variants[0].regularPrice / unifiedVariant.regularPrice. */
  regularPrice?: number;
  /** @deprecated Use variants[0].wholeSalePrice / unifiedVariant.wholeSalePrice. */
  wholeSalePrice?: number;
  /** @deprecated Use variants[0].costPrice / unifiedVariant.costPrice. */
  costPrice?: number;
  /** @deprecated Product sold is an aggregate of variants[].sold. */
  sold?: number;
  /** @deprecated Use variants[0].imageUrl / unifiedVariant.imageUrl. */
  image?: string | null;
  /** @deprecated Use variants[0].VAT / unifiedVariant.VAT. */
  VAT?: number;
  createdDate?: string;
  updatedAt: string;
  unitName?: string;
  unitId?: string | number;
  categories?: string | ICategory[];
  tags?: string | ICategory[];
  /** Number of variants (0 = simple product) */
  variantCount?: number;
  priceFrom?: number;
  priceTo?: number;
  /** 0 = simple, 1 = variant, 2 = combo */
  type?: number;
  /** @deprecated Use variants[0].isNegative / unifiedVariant.isNegative. */
  isNegative?: boolean;
  attributes?: IProductAttribute[];
  variants?: IProductVariant[];
  variant?: IProductVariant;
}

export interface IProductDetails {
  quantity?: number;
  salePrice?: number;
  regularPrice?: number;
  wholeSalePrice?: number;
  costPrice?: number;
  sold?: number;
  VAT?: number;
  createdDate?: string;
}

/** Unified product query context (mirrors backend `POST /products/search`). */
export type ProductSearchContext = "POS" | "ADMIN";

export interface IUnifiedSearchRequest {
  query?: string;
  context: ProductSearchContext;
  /** Required when context is POS (real-time stock scope). Backend also falls back to the warehouse header. */
  warehouse_id?: string | number;
  page?: string | number;
  limit?: string | number;
}

/** Variant-level row returned for POS context (fast checkout). */
export interface IPosSearchItem {
  variant_id: number;
  product_id: number;
  product_name: string;
  variant_name: string;
  display_name: string;
  sku: string;
  barcode: string | null;
  price: number;
  costPrice: number;
  stock_quantity: number;
  VAT?: number | null;
  imageUrl?: string | null;
  isNegative?: boolean;
  sold?: number;
}

/** Product-level aggregate returned for ADMIN context (backoffice management). */
export interface IAdminSearchItem {
  product_id: number;
  product_name: string;
  category_id: number | null;
  is_active: boolean;
  total_variants: number;
  total_stock: number;
  price_from?: number;
  price_to?: number;
}

export type IUnifiedSearchResponse =
  | { exact_match: true; context: ProductSearchContext; data: IPosSearchItem }
  | {
      exact_match: false;
      context: ProductSearchContext;
      data: (IPosSearchItem | IAdminSearchItem)[];
      total_count: number;
      page: number;
      limit: number;
    };

/**
 * An `IProduct` row adapted from a unified search hit so the shared
 * `OrderForm` keeps working unchanged. `unifiedVariant` is set for POS rows
 * (actionable variant, add directly without the variant picker).
 */
export interface IProductSearchRow extends IProduct {
  unifiedVariant?: IProductVariant;
  /** Set for rows mapped from ADMIN aggregates (price/sku fallbacks apply). */
  unifiedAdmin?: boolean;
}
