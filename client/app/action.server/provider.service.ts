import { HTTPService } from "~/http/index.server";
import { BaseQueryParams } from "~/types/common";
import { IProvider } from "~/types/provider";
import { IWareHouse } from "~/types/warehouse";

const API_PATH = {
  provider: "/providers",
};

interface IProviderBaseQueryParams extends BaseQueryParams {
  isProvider: boolean;
}
interface IProviderParams extends IWareHouse {}
const providerService = {
  getProviders: (params: IProviderBaseQueryParams) => {
    try {
      const qs = new URLSearchParams(params as any);
      return HTTPService.getInstance().get<{ data: IProvider[]; total: number }>(
        API_PATH.provider + "?" + qs.toString(),
      );
    } catch (error) {
      throw error;
    }
  },
  getProviderById: (id: string) => {
    return HTTPService.getInstance().get<{ data: IProvider }>(API_PATH.provider + "/" + id);
  },
  update: ({ id, ...params }: IProviderParams) => {
    return HTTPService.getInstance().post(API_PATH.provider + "/" + id, params);
  },
  create: (params: any) => {
    return HTTPService.getInstance().post(API_PATH.provider, params);
  },
};

export { providerService };
