import { HTTPService } from "~/http";
import { ILoginResponse, IRegisterParams } from "~/types/authenticate";

const API_PATH = {
  login: "/auth/login",
  register: "/auth/register",
  me: "/auth/me",
  logout: "/auth/logout",
};

export interface ILoginParams {
  email: string;
  password: string;
}

export const AuthService = {
  login: (params: ILoginParams) => {
    return HTTPService.getInstance().post<ILoginResponse, ILoginParams>(API_PATH.login, params);
  },
  register: (params: IRegisterParams) => {
    return HTTPService.getInstance().post(API_PATH.register, params);
  },
  getMe: (options?: any) => {
    return HTTPService.getInstance().get(API_PATH.me, options);
  },
  logout: () => {
    return HTTPService.getInstance().post(API_PATH.logout);
  },
};
