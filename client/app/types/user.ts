import { IVendor } from "./vendor";

export interface IUser {
  id: number;
  documentId: string;
  username: string;
  email: string;
  provider: string;
  confirmed: string;
  blocked: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  vendors?: IVendor[];
}

export interface ILoginResponse {
  jwt: string;
  user: IUser;
}
