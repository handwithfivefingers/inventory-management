import { HTTPService } from "~/http";
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
interface IUpdateParams extends ICreateProductParams {
  id: number;
  warehouseId?: number | string;
}
interface IGetParamsByID {
  id: string;
  cookie: string;
  // warehouse: string;
}

const http = HTTPService.getInstance();
const productService = {
  getProducts: ({ cookie, ...params }: IProductParams) => {
    const qs = new URLSearchParams(params);
    return http.get(API_PATH.products + "?" + qs.toString(), { Cookie: cookie });
  },
  getProductById: ({ id, cookie }: IGetParamsByID) => {
    const params = new URLSearchParams({
      // warehouse: warehouse,
    });
    return http.get(API_PATH.products + "/" + id + "?" + params.toString(), { Cookie: cookie });
  },
  createProduct: (params: ICreateProductParams) => {
    return http.post(API_PATH.products, params);
  },
  importProduct: (params: any) => {
    return http.post(`${API_PATH.products}/import`, params);
  },
  updateProduct: ({ id, warehouseId, ...params }: IUpdateParams) => {
    return http.post(`${API_PATH.products}/${id}?warehouseId=${warehouseId}`, params);
  },
};

export { productService };
