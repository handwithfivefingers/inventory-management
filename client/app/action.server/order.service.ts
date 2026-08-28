import { HTTPService } from "~/http";
import { BaseQueryParams } from "~/types/common";
import { IOrder } from "~/types/order";

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
};

export { orderService };
