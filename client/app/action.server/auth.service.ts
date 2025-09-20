import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
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
    return http.post(API_PATH.register, params);
  },
  getMe: async ({ cookie }: { cookie: string }) => {
    return HTTPService.getInstance().get(API_PATH.me, { cookie });
  },
};

export let authenticator = new Authenticator<ILoginResponse>();
authenticator.use(
  new FormStrategy(async ({ form }) => {
    let email = form.get("email") as string;
    let password = form.get("password") as string;
    return await AuthService.login({ email, password });
  }),
  "session"
);
