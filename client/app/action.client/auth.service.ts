import { http } from "~/http";

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
  data: Record<string, any>;
}
export const AuthClientService = {
  login: async (params: ILoginParams) => {
    const resp: ILoginResponse = await http.post(API_PATH.login, params);
    return resp;
  },
  getMe: async (options?: any) => {
    return http.get(API_PATH.me, options);
  },
};
