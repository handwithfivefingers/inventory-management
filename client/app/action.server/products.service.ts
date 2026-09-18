import { HTTPService } from "~/http/index.server";
import { BaseQueryParams, IResponse } from "~/types/common";
import {
  IProduct,
  IProductAttribute,
  IProductDetails,
  IProductVariant,
  IUnifiedSearchRequest,
  IUnifiedSearchResponse,
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
  getProductFull: (id: string | number) => {
    return http.get<{ data: IProduct }>(`${API_PATH.products}/${id}/full`);
  },
  adjustStockByBarcode: (params: { barcode: string; quantity: number; type: "IN" | "OUT" }) => {
    return http.post(`${API_PATH.products}/stock/by-barcode`, params);
  },
  /**
   * Unified product query for POS/Sell and Admin views.
   * Tenant context (cookie / X-Vendor / X-Warehouse) is forwarded by the
   * HTTP layer; `warehouse_id` is still sent explicitly for POS so scans are
   * always scoped even when no warehouse header is present.
   */
  searchProducts: (params: IUnifiedSearchRequest) => {
    return http.post<IUnifiedSearchResponse, IUnifiedSearchRequest>(`${API_PATH.products}/search`, params);
  },
  createProduct: (params: ICreateProductParams & { vendorId?: string | number }) => {
    return http.post(API_PATH.products, params);
  },
  deleteProduct: (id: number | string) => {
    return http.delete<{ message: string }>(`${API_PATH.products}/${id}`);
  },
  restoreProduct: (id: number | string) => {
    return http.post(`${API_PATH.products}/${id}/restore`, {});
  },
  importProduct: (params: any) => {
    return http.post(`${API_PATH.products}/import`, params);
  },
};

export { productService };
