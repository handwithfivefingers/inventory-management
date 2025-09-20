import { http } from "~/http";
import { BaseQueryParams, IResponse } from "~/types/common";
import { IProduct } from "~/types/product";

interface IProductDetails {
  inStock?: number;
  salePrice?: number;
  regularPrice?: number;
  wholeSalePrice?: number;
  costPrice?: number;
  sold?: number;
  VAT?: number;
  createdDate?: string;
}

interface IProductParams extends BaseQueryParams {
  [key: string]: any;
}

const API_PATH = {
  inventory: "/inventories",
  products: "/products",
};

const inventoryService = {
  getProducts: (params: IProductParams): Promise<IResponse<IProduct[]>> => {
    const qs = new URLSearchParams(params);
    return http.get(API_PATH.products + "?" + qs.toString());
  },
};

export { inventoryService };
