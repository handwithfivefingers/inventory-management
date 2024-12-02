import { http } from "~/http";
import { IResponse } from "~/types/common";
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

interface IGetParamsByID {
  id: string;
  warehouse: string;
}
const productService = {
  getProducts: (params: IProductParams): Promise<IResponse<IProduct[]>> => {
    const qs = new URLSearchParams({});
    return http.get(API_PATH.products + "?" + qs.toString());
  },
  getProductById: ({ id, warehouse }: IGetParamsByID): Promise<IResponse<IProduct>> => {
    const params = new URLSearchParams({
      warehouse: warehouse,
    });
    // params.append(`populate[0]`, "productDetails");
    return http.get(API_PATH.products + "/" + id + "?" + params.toString());
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
