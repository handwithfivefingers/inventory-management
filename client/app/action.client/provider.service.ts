import { http } from "~/http";
import { BaseQueryParams } from "~/types/common";
import { IWareHouse } from "~/types/warehouse";

const API_PATH = {
  provider: "/providers",
};

interface IProviderBaseQueryParams extends BaseQueryParams {
  vendor: string | number;
}
interface IProviderParams extends IWareHouse {}
const providerService = {
  getProviders: (params: IProviderBaseQueryParams) => {
    try {
      const qs = new URLSearchParams(params as any);
      const path = API_PATH.provider + "?" + qs.toString();
      return http.get(API_PATH.provider + "?" + qs.toString());
    } catch (error) {
      throw error;
    }
  },
  getProviderById: (id: string | number) => {
    return http.get(API_PATH.provider + "/" + id);
  },
  update: ({ id, ...params }: IProviderParams) => {
    return http.post(API_PATH.provider + "/" + id, params);
  },
  create: (params: any) => {
    return http.post(API_PATH.provider, params);
  },
};

export { providerService };
