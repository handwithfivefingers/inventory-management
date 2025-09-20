import { ILoginParams } from "~/action.client/auth.service";
import { HTTPService } from "~/http";
import { IAuthenticateError, ILoginResponse, IRegisterParams, IRegisterResponse } from "~/types/authenticate";
import { IResponse } from "~/types/common";

const API_PATH = {
  login: "/auth/login",
  register: "/auth/register",
  me: "/auth/me",
};

export const AuthService = {
  login: async (params: ILoginParams) => {
    return HTTPService.getInstance().post<ILoginResponse, ILoginParams>(API_PATH.login, params);
  },

  register: async (params: IRegisterParams): Promise<IResponse<IRegisterResponse>> => {
    return HTTPService.getInstance().post(API_PATH.register, params);
  },
  getMe: async ({ cookie }: { cookie: string }) => {
    return HTTPService.getInstance().get(API_PATH.me, { cookie });
  },
};
