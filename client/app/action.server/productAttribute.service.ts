import { HTTPService } from "~/http/index.server";
import { IProduct, IProductAttribute } from "~/types/product";

const API_PATH = {
  products: "/products",
};

interface GetParams {
  id: string | number;
}

const http = HTTPService.getInstance();
const productAttributeService = {
  getAttributes: () => {
    return http.get<{ data: IProductAttribute[] }>(`${API_PATH.products}/attributes`);
  },
  getAttributeById: (attributeId: string | number) => {
    return http.get<{ data: IProductAttribute }>(`${API_PATH.products}/attributes/${attributeId}`, {});
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
  createAttributeValues: ({ attributeId, values }: { attributeId: string | number; values: string[] | string }) => {
    return http.post(`${API_PATH.products}/attributes/${attributeId}/values`, { values });
  },
  updateAttributeValue: ({ valueId, value }: { valueId: string | number; value: string }) => {
    return http.put(`${API_PATH.products}/attributes/values/${valueId}`, { value });
  },
  deleteAttributeValue: ({ valueId }: { valueId: string | number }) => {
    return http.delete(`${API_PATH.products}/attributes/values/${valueId}`);
  },
  getAttributeProducts: ({ attributeId }: { attributeId: string | number }) => {
    return http.get<{ data: IProduct[]; total: number }>(`${API_PATH.products}/attributes/${attributeId}/products`);
  },
};

export { productAttributeService };
