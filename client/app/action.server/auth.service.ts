import { Authenticator } from "remix-auth";
import { http } from "~/http";
import { FormStrategy } from "remix-auth-form";
import { IUser } from "~/types/user";

const API_PATH = {
  login: "/auth/login",
  register: "/auth/local/register",
  me: "/auth/me",
};

export interface ILoginParams {
  email: string;
  password: string;
}

interface ILoginResponse {
  jwt: string;
  token: string;
  data: IUser;
}
export const AuthService = {
  login: async (params: ILoginParams) => {
    const resp: ILoginResponse = await http.post(API_PATH.login, params);
    if (resp.jwt) {
      http.setToken(resp.jwt);
    }
    return resp;
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
