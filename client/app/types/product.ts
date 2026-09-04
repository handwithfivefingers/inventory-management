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
  code?: string | null;
  skuCode: string;
  salePrice?: number | null;
  regularPrice?: number | null;
  wholeSalePrice?: number | null;
  costPrice?: number | null;
  sold?: number;
  isActive?: boolean;
  quantity?: number;
  attributeValues?: IProductAttributeValue[];
  inventories?: { id: number; warehouseId: number; quantity: number }[];
}

/** Input shape when creating a product with an attribute matrix */
export interface IVariantAttributeInput {
  name: string;
  values: string[];
}

export interface IProduct {
  id: number;
  documentId: string;
  code: string;
  createdAt: string;
  description: string;
  expiredAt: string;
  inventories: any[];
  name: string;
  publishedAt: string;
  skuCode: string;
  quantity?: number;
  salePrice?: number;
  regularPrice?: number;
  wholeSalePrice?: number;
  costPrice?: number;
  sold?: number;
  image?: string | null;
  VAT?: number;
  createdDate?: string;
  updatedAt: string;
  unitName?: string;
  unitId?: string | number;
  categories?: string | ICategory[];
  tags?: string | ICategory[];
  /** Number of variants (0 = simple product) */
  variantCount?: number;
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
