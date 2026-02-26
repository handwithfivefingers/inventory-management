import { ICustomer } from "./customer";
import { IProduct } from "./product";
import { IVendor } from "./vendor";
import { IWareHouse } from "./warehouse";
import { IOrder } from "./order";

export type InvoiceStatus = "draft" | "issued" | "paid" | "cancelled";
export type PaymentType = "cash" | "transfer" | "credit";

export interface IInvoiceDetail {
  id: number;
  invoiceId: number;
  productId?: number | null;
  product?: IProduct;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface IInvoice {
  id: number;
  invoiceNumber: string;
  orderId?: number | null;
  order?: IOrder;
  customerId?: number | null;
  customer?: ICustomer;
  vendorId?: number | null;
  vendor?: IVendor;
  warehouseId?: number | null;
  warehouse?: IWareHouse;
  subtotal: number;
  discount: number;
  VAT?: number | null;
  taxAmount: number;
  surcharge: number;
  total: number;
  paid: number;
  remaining: number;
  currency: string;
  paymentType: PaymentType;
  status: InvoiceStatus;
  dueDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  invoiceDetails?: IInvoiceDetail[];
}

export interface IInvoiceCreate {
  orderId?: number;
  customerId?: number;
  warehouseId?: number;
  items: IInvoiceItem[];
  VAT?: number;
  discount?: number;
  surcharge?: number;
  paymentType?: PaymentType;
  status?: InvoiceStatus;
  dueDate?: string;
  notes?: string;
}

export interface IInvoiceItem {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
}

export interface IInvoiceUpdate extends Partial<Omit<IInvoiceCreate, "items">> {
  id: number;
  items?: IInvoiceItem[];
  paid?: number;
}

export interface IInvoiceStatusUpdate {
  id: number;
  status: InvoiceStatus;
  paid?: number;
}
