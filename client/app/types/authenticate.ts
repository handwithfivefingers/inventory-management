import { IUser } from "./user";

export interface ILoginParams {
  email: string;
  password: string;
}

export interface ILoginResponse {
  jwt: string;
  token: string;
  data: IUser;
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
