import { BaseQueryParams } from "./common";

export interface IStaff {
  id: number;
  code: string;
  fullName: string;
  gender?: "male" | "female" | "other";
  phone?: string;
  email?: string;
  salary?: number;
  hireDate?: string;
  status: "active" | "inactive";
  address?: string;
  userId?: number;
  warehouseId?: number;
  createdAt?: string;
  warehouse?: any;
  user?: any;
}

export interface IStaffQueryParams extends BaseQueryParams {
  warehouseId?: string;
  status?: string;
  q?: string;
}
