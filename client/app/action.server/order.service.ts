import { HTTPService } from "~/http/index.server";
import { BaseQueryParams } from "~/types/common";
import { IOrder, IOrderInvoiceLine, OrderChannel } from "~/types/order";
import { IInvoice } from "~/types/invoice";

const API_PATH = {
  orders: "/orders",
  orderCreate: "/orders/create",
};

interface IOrderQueryParams extends BaseQueryParams {
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
  orderDetails: IOrderDetails[];
  price?: number | string;
  VAT?: number | string;
  surcharge?: number | string;
  paid: number | string;
  paymentType: "cash" | "transfer" | "credit";
  channel?: OrderChannel;
  warehouseId: number | string;
  cookie: string;
  vendorId: string;
}

const orderService = {
  getOrders: ({ ...searchParams }: IOrderQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return HTTPService.getInstance().get<{ data: IOrder[]; total: number }>(API_PATH.orders + "?" + qs.toString());
  },
  getOrderById: ({ id, ...searchParams }: IOrderQueryParams & { id: string }) => {
    const qs = new URLSearchParams(searchParams as any);
    return HTTPService.getInstance().get<{ data: IOrder }>(`${API_PATH.orders}/${id}?${qs.toString()}`);
  },
  createOrder: (params: IOrderCreateParams) => {
    return HTTPService.getInstance().post(API_PATH.orderCreate, params);
  },
  updateOrder: ({ id, ...params }: IOrderCreateParams & { id: string | number }) => {
    return HTTPService.getInstance().put(`${API_PATH.orders}/${id}`, params);
  },
  createOrderInvoice: ({
    id,
    ...params
  }: {
    id: string | number;
    lines: IOrderInvoiceLine[];
    paymentType?: "cash" | "transfer" | "credit";
    notes?: string;
  }) => {
    return HTTPService.getInstance().post<{ data: IInvoice }, any>(`${API_PATH.orders}/${id}/invoices`, params);
  },
  returnOrder: ({
    id,
    ...params
  }: {
    id: string | number;
    items: { orderDetailId: number; quantity: number }[];
    reason?: string;
    refundAmount?: number;
  }) => {
    return HTTPService.getInstance().post(`${API_PATH.orders}/${id}/return`, params);
  },
};

export { orderService };
