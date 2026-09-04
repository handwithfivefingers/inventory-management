import { HTTPService } from "~/http";
import { IProduct, IProductAttribute } from "~/types/product";

const API_PATH = {
  products: "/products",
};

interface VendorParams {
  vendorId?: string | number;
  cookie: string;
}
interface GetParams {
  id: string | number;
}

const http = HTTPService.getInstance();
const productAttributeService = {
  //   getProductAttributes: ({ id, vendorId, cookie }: GetParams & VendorParams) => {
  //     return http.get<{ data: IProductAttribute[] }>(`${API_PATH.products}/${id}/attributes`, {
  //       Cookie: cookie,
  //     });
  //   },
  getAttributes: ({ cookie, vendorId }: VendorParams) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.get<{ data: IProductAttribute[] }>(`${API_PATH.products}/attributes${qs}`, {
      Cookie: cookie,
    });
  },
  getAttributeById: ({ attributeId, cookie, vendorId }: VendorParams & { attributeId: string | number }) => {
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
    vendorId,
  }: VendorParams & { attributeId: string | number; values: string[] | string }) => {
    return http.post(
      `${API_PATH.products}/attributes/${attributeId}/values?vendorId=${vendorId}`,
      { values },
      { Cookie: cookie },
    );
  },
  updateAttributeValue: ({
    valueId,
    cookie,
    vendorId,
    value,
  }: VendorParams & { valueId: string | number; value: string }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.put(`${API_PATH.products}/attributes/values/${valueId}${qs}`, { value }, { Cookie: cookie });
  },
  deleteAttributeValue: ({
    valueId,
    vendorId,
    cookie,
  }: {
    valueId: string | number;
    vendorId?: string | number;
    cookie: string;
  }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.delete(`${API_PATH.products}/attributes/values/${valueId}${qs}`, { Cookie: cookie });
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
  //   // Legacy per-product attribute wrappers (deprecated, kept for product detail VariantsManager)
  //   createProductAttribute: ({
  //     id,
  //     cookie,
  //     name,
  //     values,
  //   }: {
  //     id: string | number;
  //     cookie: string;
  //     name: string;
  //     values: string[];
  //   }) => {
  //     return http.post(`${API_PATH.products}/${id}/attributes`, { name, values }, { Cookie: cookie });
  //   },
  //   updateProductAttribute: ({
  //     id,
  //     attributeId,
  //     cookie,
  //     ...params
  //   }: {
  //     id: string | number;
  //     attributeId: string | number;
  //     cookie: string;
  //     [key: string]: any;
  //   }) => {
  //     return http.put(`${API_PATH.products}/${id}/attributes/${attributeId}`, params, {
  //       Cookie: cookie,
  //     });
  //   },
  //   deleteProductAttribute: ({
  //     id,
  //     attributeId,
  //     cookie,
  //   }: {
  //     id: string | number;
  //     attributeId: string | number;
  //     cookie: string;
  //   }) => {
  //     return http.delete(`${API_PATH.products}/${id}/attributes/${attributeId}`, { Cookie: cookie });
  //   },
  //   getProductById: ({ id, warehouseId, cookie, vendorId }: IGetParamsByID & { vendorId?: string | number }) => {
  //     const params = new URLSearchParams();
  //     if (warehouseId) params.set("warehouseId", `${warehouseId}`);
  //     if (vendorId !== undefined && vendorId !== null && `${vendorId}` !== "") params.set("vendorId", `${vendorId}`);
  //     const qs = params.toString();
  //     return http.get<{ data: IProduct }>(API_PATH.products + "/" + id + (qs ? "?" + qs : ""), { Cookie: cookie });
  //   },
  //   createProduct: ({ cookie, vendorId, ...params }: ICreateProductParams & { vendorId?: string | number }) => {
  //     const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
  //     return http.post(API_PATH.products + qs, params, { Cookie: cookie });
  //   },
  //   importProduct: ({ cookie, vendorId, ...params }: any) => {
  //     const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
  //     return http.post(`${API_PATH.products}/import${qs}`, params, { Cookie: cookie });
  //   },
  //   updateProduct: ({ id, warehouseId, cookie, vendorId, ...params }: IUpdateParams & { vendorId?: string | number }) => {
  //     const paramsQS = new URLSearchParams();
  //     if (warehouseId) paramsQS.set("warehouseId", `${warehouseId}`);
  //     if (vendorId !== undefined && vendorId !== null && `${vendorId}` !== "") paramsQS.set("vendorId", `${vendorId}`);
  //     const qs = paramsQS.toString() ? `?${paramsQS.toString()}` : "";
  //     return http.post(`${API_PATH.products}/${id}${qs}`, params, { Cookie: cookie });
  //   },
};

export { productAttributeService };
