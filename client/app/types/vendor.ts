import { IWareHouse } from "./warehouse";

export interface IVendor {
  id: number;
  documentId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  warehouses?: IWareHouse[];
}
