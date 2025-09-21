import { ILoginParams } from "~/action.client/auth.service";
import { HTTPService } from "~/http";
import { ILoginResponse, IRegisterParams, IRegisterResponse } from "~/types/authenticate";
import { IResponse } from "~/types/common";
import { IUser } from "~/types/user";

const API_PATH = {
  login: "/auth/login",
  register: "/auth/register",
  me: "/auth/me",
};

export const AuthService = {
  login: async (params: ILoginParams) => {
    return HTTPService.getInstance().post<ILoginResponse, ILoginParams>(API_PATH.login, params);
  },

  register: async (params: IRegisterParams) => {
    return HTTPService.getInstance().post(API_PATH.register, params);
  },
  getMe: async ({ cookie }: { cookie: string }) => {
    return HTTPService.getInstance().get<IUser>(API_PATH.me, { cookie });
  },
};
