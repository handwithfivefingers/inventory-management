import { IUser } from "./user";

// Re-export types from user, vendor, warehouse to avoid duplication
export type { IRole, IPermission } from "./user";

export interface ILoginParams {
  email: string;
  password: string;
}

type LoginSuccess = {
  status: 200;
  data: IUser & { token: string };
};
type LoginError = {
  // Liệt kê các mã lỗi cụ thể ở đây
  status: 400 | 401 | 403 | 404 | 500;
  data: {
    error: string;
  };
};
export type ILoginResponse = LoginSuccess | LoginError;

export interface IRegisterParams {
  email: string;
  password: string;
  vendor: string;
  warehouse: string;
  fullName?: string;
  confirmPassword?: string;
  niche?: string;
  language?: "vi" | "en";
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
