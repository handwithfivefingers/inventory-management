import { HTTPService } from "~/http";
import { BaseQueryParams } from "~/types/common";
import { IProvider } from "~/types/provider";
import { IWareHouse } from "~/types/warehouse";

const API_PATH = {
  provider: "/providers",
};

interface IProviderBaseQueryParams extends BaseQueryParams {
  vendor: string | number;
  isProvider: boolean;
}
interface IProviderParams extends IWareHouse {}
const providerService = {
  getProviders: ({ cookie, ...params }: IProviderBaseQueryParams) => {
    try {
      const qs = new URLSearchParams(params as any);
      return HTTPService.getInstance().get<IProvider[]>(API_PATH.provider + "?" + qs.toString(), { Cookie: cookie });
    } catch (error) {
      throw error;
    }
  },
  getProviderById: ({ id, cookie }: { id: string } & { cookie: string }) => {
    return HTTPService.getInstance().get<IProvider>(API_PATH.provider + "/" + id, { Cookie: cookie });
  },
  update: ({ id, ...params }: IProviderParams) => {
    return HTTPService.getInstance().post(API_PATH.provider + "/" + id, params);
  },
  create: (params: any) => {
    return HTTPService.getInstance().post(API_PATH.provider, params);
  },
};

export { providerService };
