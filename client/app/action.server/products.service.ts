import { HTTPService } from "~/http/index.server";
import { BaseQueryParams, IResponse } from "~/types/common";
import { IProduct, IProductAttribute, IProductDetails, IProductVariant } from "~/types/product";

const API_PATH = {
  products: "/products",
};
interface IProductParams extends BaseQueryParams {
  [key: string]: any;
}
interface ICreateProductParams {
  cookie: string;
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
}
interface IUpdateParams extends ICreateProductParams {
  id: number;
  warehouseId?: number | string;
}
interface IGetParamsByID {
  id: string;
}

const http = HTTPService.getInstance();
const productService = {
  getProducts: ({ ...params }: IProductParams) => {
    const qs = new URLSearchParams(params);
    return http.get<{ data: IProduct[]; total: number }>(API_PATH.products + "?" + qs.toString());
  },
  getProductVariants: ({ id, ...params }: { id: string | number }) => {
    const qs = new URLSearchParams(params as any);
    const suffix = qs.toString() ? "?" + qs.toString() : "";
    return http.get<{ data: IProductVariant[]; total: number }>(`${API_PATH.products}/${id}/variants${suffix}`);
  },
  updateProduct: ({ id, ...params }: IUpdateParams) => {
    const paramsQS = new URLSearchParams();
    const qs = paramsQS.toString() ? `?${paramsQS.toString()}` : "";
    return http.put(`${API_PATH.products}/${id}`, params);
  },
  getAttributes: () => {
    return http.get<{ data: IProductAttribute[] }>(`${API_PATH.products}/attributes`, {});
  },
  getAttributeById: ({ attributeId }: { attributeId: string | number }) => {
    return http.get<{ data: IProductAttribute }>(`${API_PATH.products}/attributes/${attributeId}`);
  },
  createAttribute: ({ name, values }: { name: string; values?: string[] }) => {
    return http.post(`${API_PATH.products}/attributes`, { name, values });
  },
  updateAttribute: ({ attributeId, ...params }: { attributeId: string | number; [key: string]: any }) => {
    return http.put(`${API_PATH.products}/attributes/${attributeId}`, params);
  },
  deleteAttribute: ({ attributeId }: { attributeId: string | number }) => {
    return http.delete(`${API_PATH.products}/attributes/${attributeId}`);
  },

  getProductById: (id: string | number) => {
    return http.get<{ data: IProduct }>(API_PATH.products + "/" + id);
  },
  createProduct: (params: ICreateProductParams & { vendorId?: string | number }) => {
    return http.post(API_PATH.products, params);
  },
  importProduct: (params: any) => {
    return http.post(`${API_PATH.products}/import`, params);
  },
};

export { productService };
