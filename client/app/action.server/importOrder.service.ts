import { http } from "~/http";
import { IOrderCreateParams, IOrderQueryParams, IImportOrder } from "~/types/provider";

const API_PATH = {
  orders: "/import-order",
};

const importOrderService = {
  getOrders: (searchParams: IOrderQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get<{ data: IImportOrder[]; total: number }>(API_PATH.orders + "?" + qs.toString());
  },
  getOrderById: (id: string | number) => {
    return http.get<{ data: IImportOrder }>(`${API_PATH.orders}/${id}`);
  },
  createOrder: (params: IOrderCreateParams) => {
    return http.post(API_PATH.orders, params);
  },
};

export { importOrderService };
