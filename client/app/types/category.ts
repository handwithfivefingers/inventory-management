import { BaseQueryParams } from "./common";
import { IProduct } from "./product";
export interface ICategoryQueryParams extends BaseQueryParams {
  vendorId: string;
}
export interface ICategoryParams {
  name: string;
  vendorId: string | number;
}

export interface ICategory {
  name: string;
  products?: IProduct[];
  id?: number;
}
