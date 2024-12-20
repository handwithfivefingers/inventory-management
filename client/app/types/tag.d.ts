import { BaseQueryParams } from "./common";
import { IProduct } from "./product";
export interface ITagQueryParams extends BaseQueryParams {
  vendorId: string;
}
export interface ITagParams {
  id?: number | string;
  name: string;
  vendorId: string | number;
}

export interface ITag {
  name: string;
  id?: number;
}
