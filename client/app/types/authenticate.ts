import { IUser } from "./user";

export interface ILoginParams {
  email: string;
  password: string;
}

export interface ILoginResponse {
  data: {
    jwt: string;
    data: IUser;
    message?: string;
    status?: number;
    error?: any;
  };
  token: string;
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
