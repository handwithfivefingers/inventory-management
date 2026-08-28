import { http } from "~/http";
import { IOrderCreateParams, IOrderQueryParams, IImportOrder } from "~/types/provider";

const API_PATH = {
  orders: "/import-order",
};

const importOrderService = {
  getOrders: (searchParams: IOrderQueryParams & { cookie?: string; vendorId?: string | number }) => {
    const { cookie, vendorId, ...rest } = searchParams as any;
    const merged: any = { ...rest };
    if (vendorId !== undefined && vendorId !== null && `${vendorId}` !== "") merged.vendorId = vendorId;
    const qs = new URLSearchParams(merged as any);
    const headers = cookie ? { cookie } : undefined;
    return http.get<{ data: IImportOrder[]; total: number }>(API_PATH.orders + "?" + qs.toString(), headers);
  },
  getOrderById: (id: string | number, opts?: { cookie?: string; vendorId?: string | number }) => {
    const qs = opts?.vendorId !== undefined && opts?.vendorId !== null && `${opts.vendorId}` !== "" ? `?vendorId=${opts.vendorId}` : "";
    const headers = opts?.cookie ? { cookie: opts.cookie } : undefined;
    return http.get<{ data: IImportOrder }>(`${API_PATH.orders}/${id}${qs}`, headers);
  },
  createOrder: (params: IOrderCreateParams & { cookie?: string; vendorId?: string | number }) => {
    const { cookie, vendorId, ...body } = params as any;
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    const headers = cookie ? { cookie } : undefined;
    return http.post(API_PATH.orders + qs, body, headers);
  },
};

export { importOrderService };
