import { http } from "~/http";

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
const API_PATH = {
  inventory: "/inventories",
};

interface IProductParams {
  [key: string]: any;
}
const inventoryService = {
  getProducts: (params: IProductParams) => {
    const qs = new URLSearchParams({});
    qs.append(`populate`, "product");
    qs.append(`filters[warehouse][documentId][$eq]`, params.warehouseId);
    return http.get(API_PATH.inventory + "?" + qs.toString());
  },
};

export { inventoryService };
