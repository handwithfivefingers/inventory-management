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
  getProductVariants: ({ id, cookie, ...params }: { id: string | number; cookie: string; warehouseId?: string; vendorId?: string | number }) => {
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
  getAttributes: ({ cookie, vendorId }: { cookie: string; vendorId?: string | number }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.get<{ data: IProductAttribute[] }>(`${API_PATH.products}/attributes${qs}`, {
      Cookie: cookie,
    });
  },
  getAttributeById: ({ attributeId, cookie, vendorId }: { attributeId: string | number; cookie: string; vendorId?: string | number }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.get<{ data: IProductAttribute }>(`${API_PATH.products}/attributes/${attributeId}${qs}`, {
      Cookie: cookie,
    });
  },
  createAttribute: ({
    cookie,
    vendorId,
    name,
    values,
  }: {
    cookie: string;
    vendorId?: string | number;
    name: string;
    values?: string[];
  }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.post(`${API_PATH.products}/attributes${qs}`, { name, values }, { Cookie: cookie });
  },
  updateAttribute: ({
    attributeId,
    cookie,
    vendorId,
    ...params
  }: {
    attributeId: string | number;
    cookie: string;
    vendorId?: string | number;
    [key: string]: any;
  }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.put(`${API_PATH.products}/attributes/${attributeId}${qs}`, params, {
      Cookie: cookie,
    });
  },
  deleteAttribute: ({
    attributeId,
    cookie,
    vendorId,
  }: {
    attributeId: string | number;
    cookie: string;
    vendorId?: string | number;
  }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.delete(`${API_PATH.products}/attributes/${attributeId}${qs}`, { Cookie: cookie });
  },
  createAttributeValues: ({
    attributeId,
    cookie,
    values,
  }: {
    attributeId: string | number;
    cookie: string;
    values: string[] | string;
  }) => {
    return http.post(`${API_PATH.products}/attributes/${attributeId}/values`, { values }, { Cookie: cookie });
  },
  updateAttributeValue: ({
    valueId,
    cookie,
    value,
  }: {
    valueId: string | number;
    cookie: string;
    value: string;
  }) => {
    return http.put(`${API_PATH.products}/attributes/values/${valueId}`, { value }, { Cookie: cookie });
  },
  deleteAttributeValue: ({ valueId, cookie }: { valueId: string | number; cookie: string }) => {
    return http.delete(`${API_PATH.products}/attributes/values/${valueId}`, { Cookie: cookie });
  },
  getAttributeProducts: ({
    attributeId,
    cookie,
    vendorId,
  }: {
    attributeId: string | number;
    cookie: string;
    vendorId?: string | number;
  }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.get<{ data: IProduct[]; total: number }>(
      `${API_PATH.products}/attributes/${attributeId}/products${qs}`,
      { Cookie: cookie },
    );
  },
  // Legacy per-product attribute wrappers (deprecated, kept for product detail VariantsManager)
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
  getProductById: ({ id, warehouseId, cookie, vendorId }: IGetParamsByID & { vendorId?: string | number }) => {
    const params = new URLSearchParams();
    if (warehouseId) params.set("warehouseId", `${warehouseId}`);
    if (vendorId !== undefined && vendorId !== null && `${vendorId}` !== "") params.set("vendorId", `${vendorId}`);
    const qs = params.toString();
    return http.get<{ data: IProduct }>(API_PATH.products + "/" + id + (qs ? "?" + qs : ""), { Cookie: cookie });
  },
  createProduct: ({ cookie, vendorId, ...params }: ICreateProductParams & { vendorId?: string | number }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.post(API_PATH.products + qs, params, { Cookie: cookie });
  },
  importProduct: ({ cookie, vendorId, ...params }: any) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.post(`${API_PATH.products}/import${qs}`, params, { Cookie: cookie });
  },
  updateProduct: ({ id, warehouseId, cookie, vendorId, ...params }: IUpdateParams & { vendorId?: string | number }) => {
    const paramsQS = new URLSearchParams();
    if (warehouseId) paramsQS.set("warehouseId", `${warehouseId}`);
    if (vendorId !== undefined && vendorId !== null && `${vendorId}` !== "") paramsQS.set("vendorId", `${vendorId}`);
    const qs = paramsQS.toString() ? `?${paramsQS.toString()}` : "";
    return http.post(`${API_PATH.products}/${id}${qs}`, params, { Cookie: cookie });
  },
};

export { productService };
