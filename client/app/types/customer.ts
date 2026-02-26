import { IVendor } from "./vendor";

export interface ICustomer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxCode?: string | null;
  vendorId?: number | null;
  vendor?: IVendor;
  createdAt: string;
  updatedAt: string;
}

export interface ICustomerCreate {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  vendorId?: number;
}

export interface ICustomerUpdate extends Partial<ICustomerCreate> {
  id: number;
}
