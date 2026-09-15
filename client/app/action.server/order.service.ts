import { HTTPService } from "~/http";
import { BaseQueryParams } from "~/types/common";
import { IOrder, IOrderInvoiceLine, OrderChannel } from "~/types/order";
import { IInvoice } from "~/types/invoice";

const API_PATH = {
  orders: "/orders",
  orderCreate: "/orders/create",
};

interface IOrderQueryParams extends BaseQueryParams {
  warehouseId: string;
  vendorId?: string;
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
  getOrders: ({ cookie, ...searchParams }: IOrderQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return HTTPService.getInstance().get<{ data: IOrder[]; total: number }>(API_PATH.orders + "?" + qs.toString(), {
      Cookie: cookie,
    });
  },
  getOrderById: ({ id, cookie, ...searchParams }: IOrderQueryParams & { id: string }) => {
    const qs = new URLSearchParams(searchParams as any);
    return HTTPService.getInstance().get<{ data: IOrder }>(`${API_PATH.orders}/${id}?${qs.toString()}`, {
      Cookie: cookie,
    });
  },
  createOrder: ({ cookie, vendorId, ...params }: IOrderCreateParams & { vendorId: string }) => {
    return HTTPService.getInstance().post(API_PATH.orderCreate + `?vendorId=${vendorId}`, params, {
      Cookie: cookie,
    });
  },
  updateOrder: ({ id, cookie, ...params }: IOrderCreateParams & { id: string | number; cookie: string }) => {
    return HTTPService.getInstance().put(`${API_PATH.orders}/${id}?vendorId=${params.vendorId}`, params, {
      Cookie: cookie,
    });
  },
  createOrderInvoice: ({
    id,
    cookie,
    ...params
  }: {
    id: string | number;
    cookie: string;
    vendorId?: string;
    lines: IOrderInvoiceLine[];
    paymentType?: "cash" | "transfer" | "credit";
    notes?: string;
  }) => {
    const qs = params.vendorId ? `?vendorId=${params.vendorId}` : "";
    return HTTPService.getInstance().post<{ data: IInvoice }, any>(`${API_PATH.orders}/${id}/invoices${qs}`, params, {
      Cookie: cookie,
    });
  },
  returnOrder: ({
    id,
    cookie,
    ...params
  }: {
    id: string | number;
    cookie: string;
    vendorId?: string;
    items: { orderDetailId: number; quantity: number }[];
    reason?: string;
    refundAmount?: number;
  }) => {
    const qs = params.vendorId ? `?vendorId=${params.vendorId}` : "";
    return HTTPService.getInstance().post(`${API_PATH.orders}/${id}/return${qs}`, params, { Cookie: cookie });
  },
};

export { orderService };
