import { IVendor } from "./vendor";
import { IWareHouse } from "./warehouse";

export interface IPermission {
  id: number;
  name: string;
  C: boolean;
  R: boolean;
  U: boolean;
  D: boolean;
}

export interface IRole {
  id: number;
  name: string;
  isSystem?: boolean;
  isGlobal?: boolean;
  permissions: IPermission[];
}

export interface IUser {
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
