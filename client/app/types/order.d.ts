export interface IOrderDetails {
  productId: number | string;
  quantity: number | string;
  price: number | string;
  buyPrice: number | string;
  note?: string;
}
export interface IOrder {
  orderDetails: IOrderDetails[];
  price?: number | string;
  VAT?: number | string;
  surcharge?: number | string;
  paid: number | string;
  paymentType: "cash" | "transfer";
  warehouseId: number | string;
  providerId: number | string;
  createdAt: string;
  updatedAt: string;
}
