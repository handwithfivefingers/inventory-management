import { HTTPService } from "~/http";
import { BaseQueryParams } from "~/types/common";
import { IOrder } from "~/types/order";

const API_PATH = {
  orders: "/orders",
  orderCreate: "/orders/create",
};

interface IOrderQueryParams extends BaseQueryParams {
  warehouseId: string;
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
  paymentType: "cash" | "transfer";
  warehouseId: number | string;
  cookie: string;
}

const orderService = {
  getOrders: ({ cookie, ...searchParams }: IOrderQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return HTTPService.getInstance().get<IOrder[]>(API_PATH.orders + "?" + qs.toString(), {
      Cookie: cookie,
    });
  },
  getOrderById: ({ id, cookie, ...searchParams }: IOrderQueryParams & { id: string }) => {
    const qs = new URLSearchParams(searchParams as any);
    return HTTPService.getInstance().get<IOrder>(`${API_PATH.orders}/${id}?${qs.toString()}`, {
      Cookie: cookie,
    });
  },
  createOrder: ({ cookie, ...params }: IOrderCreateParams) => {
    return HTTPService.getInstance().post(API_PATH.orderCreate, params, { Cookie: cookie });
  },
};

export { orderService };
