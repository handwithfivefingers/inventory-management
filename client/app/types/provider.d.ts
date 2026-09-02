import { BaseQueryParams } from "./common";
import { IOrderDetails } from "./order";

export interface IProvider {
  id: number;
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  vendorId: number;
  createdAt: string;
  updatedAt: string;
}

export interface IOrderQueryParams extends BaseQueryParams {
  vendor?: string;
  warehouseId?: string;
  isProvider?: boolean;
}

export interface IImportOrder {
  id: number;
  VAT?: number;
  paid?: number;
  surcharge?: number;
  price?: number;
  paymentType?: string;
  providerId?: number;
  warehouseId?: number;
  createdAt?: string;
  provider?: IProvider;
  orderDetails: IOrderDetails[];
  staffName?: string;
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
