import { http } from "~/http";
import { BaseQueryParams } from "~/types/common";

const API_PATH = {
  orders: "/orders",
  orderCreate: "/orders/create",
};

interface IOrderQueryParams extends BaseQueryParams {
  warehouse: string;
  isProvider?: boolean;
}
interface IOrderDetails {
  productId: number | string;
  quantity: number | string;
  price: number | string;
  buyPrice: number | string;
  note?: string;
}
interface IOrderCreateParams {
  OrderDetails: IOrderDetails[];
  price?: number | string;
  VAT?: number | string;
  surcharge?: number | string;
  paid: number | string;
  paymentType: "cash" | "transfer";
  warehouseId: number | string;
}

const orderService = {
  getOrders: (searchParams: IOrderQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get(API_PATH.orders + "?" + qs.toString());
  },
  createOrder: (params: IOrderCreateParams) => {
    return http.post(API_PATH.orderCreate, params);
  },
};

export { orderService };
