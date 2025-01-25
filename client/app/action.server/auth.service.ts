import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { ILoginParams } from "~/action.client/auth.service";
import { http } from "~/http";
import { ILoginResponse, IRegisterParams, IRegisterResponse } from "~/types/authenticate";
import { IResponse } from "~/types/common";

const API_PATH = {
  login: "/auth/login",
  register: "/auth/register",
  me: "/auth/me",
};

export const AuthService = {
  login: async (params: ILoginParams) => {
    console.log("params", params);
    const resp: ILoginResponse = await http.post(API_PATH.login, params);
    if (resp.jwt) {
      http.setToken(resp.jwt);
    }
    return resp;
  },

  register: async (params: IRegisterParams): Promise<IResponse<IRegisterResponse>> => {
    return http.post(API_PATH.register, params);
  },
  getMe: async (options?: any) => {
    return http.get(API_PATH.me, options);
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
