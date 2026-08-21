import { BaseQueryParams } from "./common";

export interface IShift {
  id: number;
  code: string;
  staffId?: number;
  staff?: any;
  openTime: string;
  closeTime?: string;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  actualCash?: number;
  difference?: number;
  status: "open" | "closed";
  note?: string;
  warehouseId?: number;
  createdAt?: string;
}

export interface IShiftQueryParams extends BaseQueryParams {
  warehouseId?: string;
  status?: string;
}
