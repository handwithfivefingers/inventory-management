import { http } from "~/http";
import { IOrderCreateParams, IOrderQueryParams } from "~/types/provider";

const API_PATH = {
  orders: "/import-order",
};

const importOrderService = {
  getOrders: (searchParams: IOrderQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get(API_PATH.orders + "?" + qs.toString());
  },
  createOrder: (params: IOrderCreateParams) => {
    return http.post(API_PATH.orders, params);
  },
};

export { importOrderService };
