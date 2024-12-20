import { BaseQueryParams } from "./common";

export interface IProvider {
  id: number;
  documentId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  isMain: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface IOrderQueryParams extends BaseQueryParams {
  vendor: string;
  isProvider?: boolean;
}
export interface IOrderDetails {
  productId: number | string;
  quantity: number | string;
  price: number | string;
  buyPrice: number | string;
  note?: string;
}
export interface IOrderCreateParams {
  OrderDetails: IOrderDetails[];
  price?: number | string;
  VAT?: number | string;
  surcharge?: number | string;
  paid: number | string;
  paymentType: "cash" | "transfer";
  warehouseId: number | string;
  providerId: number | string;
}
