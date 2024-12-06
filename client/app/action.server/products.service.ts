import { http } from "~/http";
import { BaseQueryParams, IResponse } from "~/types/common";
import { IProduct, IProductDetails } from "~/types/product";

const API_PATH = {
  products: "/products",
};
interface IProductParams extends BaseQueryParams {
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
interface IGetParamsByID {
  id: string;
  warehouse: string;
}
const productService = {
  getProducts: (params?: IProductParams): Promise<IResponse<IProduct[]>> => {
    const qs = new URLSearchParams(params);
    return http.get(API_PATH.products + "?" + qs.toString());
  },
  getProductById: ({ id, warehouse }: IGetParamsByID): Promise<IResponse<IProduct>> => {
    const params = new URLSearchParams({
      warehouse: warehouse,
    });
    return http.get(API_PATH.products + "/" + id + "?" + params.toString());
  },
  createProduct: (params: ICreateProductParams) => {
    return http.post(API_PATH.products, params);
  },
};

export { productService };
