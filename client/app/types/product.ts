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
  updatedAt: string;
  productDetails: IProductDetails;
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
