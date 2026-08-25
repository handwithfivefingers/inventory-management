import { HTTPService } from "~/http";
import { BaseQueryParams, IResponse } from "~/types/common";
import {
  IProduct,
  IProductAttribute,
  IProductDetails,
  IProductVariant,
} from "~/types/product";

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
  cookie: string;
  warehouseId: string;
}

const http = HTTPService.getInstance();
const productService = {
  getProducts: ({ cookie, ...params }: IProductParams) => {
    const qs = new URLSearchParams(params);
    return http.get<{ data: IProduct[]; total: number }>(API_PATH.products + "?" + qs.toString(), { Cookie: cookie });
  },
  getProductVariants: ({ id, cookie, ...params }: { id: string | number; cookie: string; warehouseId?: string }) => {
    const qs = new URLSearchParams(params as any);
    const suffix = qs.toString() ? "?" + qs.toString() : "";
    return http.get<{ data: IProductVariant[]; total: number }>(
      `${API_PATH.products}/${id}/variants${suffix}`,
      { Cookie: cookie },
    );
  },
  updateVariant: ({
    id,
    variantId,
    cookie,
    ...params
  }: {
    id: string | number;
    variantId: string | number;
    cookie: string;
    [key: string]: any;
  }) => {
    return http.put(`${API_PATH.products}/${id}/variants/${variantId}`, params, { Cookie: cookie });
  },
  deleteVariant: ({
    id,
    variantId,
    cookie,
  }: {
    id: string | number;
    variantId: string | number;
    cookie: string;
  }) => {
    return http.delete(`${API_PATH.products}/${id}/variants/${variantId}`, { Cookie: cookie });
  },
  /** Bulk-sync attributes + variants from the combined editor */
  syncProductVariants: ({
    id,
    cookie,
    ...params
  }: {
    id: string | number;
    cookie: string;
    [key: string]: any;
  }) => {
    return http.put(`${API_PATH.products}/${id}/variants/sync`, params, { Cookie: cookie });
  },
  getProductAttributes: ({ id, cookie }: { id: string | number; cookie: string }) => {
    return http.get<{ data: IProductAttribute[] }>(`${API_PATH.products}/${id}/attributes`, {
      Cookie: cookie,
    });
  },
  getAttributes: ({ cookie }: { cookie: string }) => {
    return http.get<{ data: IProductAttribute[] }>(`${API_PATH.products}/attributes`, {
      Cookie: cookie,
    });
  },
  createProductAttribute: ({
    id,
    cookie,
    name,
    values,
  }: {
    id: string | number;
    cookie: string;
    name: string;
    values: string[];
  }) => {
    return http.post(`${API_PATH.products}/${id}/attributes`, { name, values }, { Cookie: cookie });
  },
  updateProductAttribute: ({
    id,
    attributeId,
    cookie,
    ...params
  }: {
    id: string | number;
    attributeId: string | number;
    cookie: string;
    [key: string]: any;
  }) => {
    return http.put(`${API_PATH.products}/${id}/attributes/${attributeId}`, params, {
      Cookie: cookie,
    });
  },
  deleteProductAttribute: ({
    id,
    attributeId,
    cookie,
  }: {
    id: string | number;
    attributeId: string | number;
    cookie: string;
  }) => {
    return http.delete(`${API_PATH.products}/${id}/attributes/${attributeId}`, { Cookie: cookie });
  },
  getProductById: ({ id, warehouseId, cookie }: IGetParamsByID) => {
    const params = new URLSearchParams({
      warehouseId,
    });
    return http.get<{ data: IProduct }>(API_PATH.products + "/" + id + "?" + params.toString(), { Cookie: cookie });
  },
  createProduct: ({ cookie, ...params }: ICreateProductParams) => {
    return http.post(API_PATH.products, params, { Cookie: cookie });
  },
  importProduct: ({ cookie, ...params }: any) => {
    return http.post(`${API_PATH.products}/import`, params, { Cookie: cookie });
  },
  updateProduct: ({ id, warehouseId, cookie, ...params }: IUpdateParams) => {
    return http.post(`${API_PATH.products}/${id}?warehouseId=${warehouseId}`, params, { Cookie: cookie });
  },
};

export { productService };
