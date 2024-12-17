import { ICategory } from "./category";
import { IVendor } from "./vendor";

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
  VAT?: number;
  createdDate?: string;
  updatedAt: string;
  unitName?: string;
  unitId?: string | number;
  categories?: string | ICategory[];
  tags?: string | ICategory[];
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
