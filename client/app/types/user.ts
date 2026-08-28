import { IVendor } from "./vendor";
import { IWareHouse } from "./warehouse";

export interface IPermission {
  id: number;
  name: string;
  method: "CREATE" | "READ" | "UPDATE" | "DELETE";
}

export interface IRole {
  id: number;
  name: string;
  isSystem?: boolean;
  isGlobal?: boolean;
  isAdmin?: boolean;
  permissions: IPermission[];
}

export interface IUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  subscription?: string;
  role?: IRole[];
  vendors?: IVendor[];
  defaultVendorId?: number | null;
  defaultWarehouseId?: number | null;
}

export interface ILoginResponse {
  data: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    nickname?: string;
    subscription?: string;
    roles?: IRole[];
    vendors?: IVendor[];
    defaultVendorId?: number | null;
    defaultWarehouseId?: number | null;
    token: string;
  };
}
