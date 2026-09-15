export type OrderChannel = "POS" | "WHOLESALE" | "ONLINE";

export interface IOrderDetails {
  id?: number;
  productId: number | string;
  variantId?: number | string | null;
  quantity: number | string;
  price: number | string;
  buyPrice: number | string;
  note?: string;
  name?: string;
  /** Realtime invoice progress (computed by backend, never stored). */
  invoicedQty?: number;
  remainingQty?: number;
}
export interface IOrder {
  id: number;
  code?: string | null;
  channel?: OrderChannel;
  status?: string;
  orderDetails: IOrderDetails[];
  price?: number | string;
  VAT?: number | string;
  surcharge?: number | string;
  paid: number | string;
  paymentType: "cash" | "transfer" | "credit";
  warehouseId: number | string;
  providerId: number | string;
  createdAt: string;
  updatedAt: string;
  staffName?: string;
  customerName?: string;
}

export interface IOrderInvoiceLine {
  order_detail_id: number;
  quantity: number;
}
