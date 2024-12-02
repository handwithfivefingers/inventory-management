import { http } from "~/http";
import { IResponse } from "~/types/common";
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

interface ICreateProductParams {
  data: {
    name: string;
    skuCode?: string;
    code?: string;
    expiredAt?: string;
    description?: string;
    category?: string;
    unit?: string;
    tags?: string;
    images?: string;
    productDetails?: IProductDetails;
    history?: IProductDetails[];
  };
}

interface IProductParams {
  [key: string]: any;
}

const API_PATH = {
  inventory: "/inventories",
  products: "/products",
};

const inventoryService = {
  getProducts: (params: IProductParams): Promise<IResponse<IProduct[]>> => {
    const qs = new URLSearchParams({});
    return http.get(API_PATH.products + "?" + qs.toString());
  },
};

export { inventoryService };
