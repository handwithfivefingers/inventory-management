import { HTTPService } from "~/http/index.server";
import { ILoginResponse, IRegisterParams } from "~/types/authenticate";
import { IUser } from "~/types/user";
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
  login: async (params: ILoginParams) => {
    return HTTPService.getInstance().post<ILoginResponse, ILoginParams>(API_PATH.login, params);
  },

  register: async (params: IRegisterParams) => {
    return HTTPService.getInstance().post(API_PATH.register, params);
  },
  getMe: async ({ cookie }: { cookie: string }) => {
    return HTTPService.getInstance().get<{ data: IUser }>(API_PATH.me, { cookie });
  },
  logout: () => {
    return HTTPService.getInstance().post(API_PATH.logout);
  },
};
