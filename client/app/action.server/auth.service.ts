import { http } from "~/http";

const API_PATH = {
  login: "/auth/local",
  register: "/auth/local/register",
  me: "/users/me",
};

interface ILoginParams {
  email: string;
  password: string;
}

interface ILoginResponse {
  jwt: string;
  user: Record<string, any>;
}
interface IApiResponse<IData> {
  data: IData;
}

export const AuthService = {
  login: async (params: ILoginParams) => {
    http.removeHeader("Authorization");
    const resp: ILoginResponse = await http.post(API_PATH.login, params);
    console.log("resp", resp);
    if (resp.jwt) {
      http.setToken(resp.jwt);
    }
    return resp;
  },
  getMe: async () => {
    const qs = new URLSearchParams({});
    qs.append("populate[vendors][populate][warehouses]", "*");
    return http.get(API_PATH.me + "?" + qs.toString());
  },
};
