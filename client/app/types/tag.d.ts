import { BaseQueryParams } from "./common";
import { IProduct } from "./product";
export interface ITagQueryParams extends BaseQueryParams {}
export interface ITagParams {
  id?: number | string;
  name: string;
}

export interface ITag {
  name: string;
  id?: number;
  createdAt?: string;
  updatedAt?: string;
}
