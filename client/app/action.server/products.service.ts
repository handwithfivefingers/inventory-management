import { http } from "~/http";
import { IProduct, IProductDetails } from "~/types/product";

const API_PATH = {
  products: "/products",
};
interface IProductParams {
  [key: string]: any;
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
interface ICreateProductQueryParams {
  warehouseId: string;
  vendorId: string;
  quantity: string;
}

interface IProductResponse<T> {
  data: T[];
}
const productService = {
  getProducts: (params?: IProductParams): Promise<IProductResponse<IProduct>> => {
    const qs = new URLSearchParams({});
    qs.append(`populate[1]`, "inventories");
    qs.append(`populate[0]`, "productDetails");

    if (params?.warehouse) {
      qs.append("warehouse", params?.warehouse);
    }
    return http.get(API_PATH.products + "?" + qs.toString());
  },
  getProductById: (documentId: string) => {
    const params = new URLSearchParams({});
    params.append(`populate[0]`, "productDetails");
    return http.get(API_PATH.products + "/" + documentId + "?" + params.toString());
  },
  createProduct: (params: ICreateProductParams, qsParams: ICreateProductQueryParams) => {
    console.log("params", params);
    const qs = new URLSearchParams({
      warehouseId: qsParams.warehouseId,
      vendorId: qsParams.vendorId,
      quantity: qsParams.quantity,
    });
    return http.post(API_PATH.products + "?" + qs.toString(), params);
  },
};

export { productService };
