// Re-export types from user, vendor, warehouse to avoid duplication
export type { 
  IUser, 
  IRole, 
  IPermission, 
  ILoginResponse 
} from "./user";

export interface ILoginParams {
  email: string;
  password: string;
}

// Keep IVendor and IWarehouse here for backward compatibility
// but they should be imported from their respective files
export interface IVendor {
  id: number;
  name: string;
  warehouses?: IWarehouse[];
}

export interface IWarehouse {
  id: number;
  name: string;
  isMain: boolean;
  address?: string;
  phone?: string;
  email?: string;
}

export interface IRegisterParams {
  email: string;
  password: string;
  vendor: string;
  warehouse: string;
  firstName?: string;
  lastName?: string;
  confirmPassword?: string;
  nickname?: string;
}

export interface IRegisterResponse {
  user: Record<string, string>;
  role: Record<string, string>;
  permission: Record<string, string>;
  vendor: Record<string, string>;
  warehouse: Record<string, string>;
}

export interface IAuthenticateError extends Error {
  error: {
    error: string;
  };
  status: number;
}
