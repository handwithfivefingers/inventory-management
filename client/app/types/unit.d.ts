import { BaseQueryParams } from "./common";
import { IProduct } from "./product";
import { ITag, ITagParams, ITagQueryParams } from "./tag";
export interface IUnitQueryParams extends ITagQueryParams {}
export interface IUnitParams extends ITagParams {}
export interface IUnit extends ITag {}
