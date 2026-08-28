import { HTTPService } from "~/http";
import { BaseQueryParams } from "~/types/common";
import { IProvider } from "~/types/provider";
import { IWareHouse } from "~/types/warehouse";

const API_PATH = {
  provider: "/providers",
};

interface IProviderBaseQueryParams extends BaseQueryParams {
  vendorId: string | number;
  isProvider: boolean;
}
interface IProviderParams extends IWareHouse {}
const providerService = {
  getProviders: ({ cookie, ...params }: IProviderBaseQueryParams) => {
    try {
      const qs = new URLSearchParams(params as any);
      return HTTPService.getInstance().get<{ data: IProvider[]; total: number }>(
        API_PATH.provider + "?" + qs.toString(),
        {
          Cookie: cookie,
        },
      );
    } catch (error) {
      throw error;
    }
  },
  getProviderById: ({ id, cookie, vendorId }: { id: string; cookie: string; vendorId?: string | number }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return HTTPService.getInstance().get<{ data: IProvider }>(API_PATH.provider + "/" + id + qs, { Cookie: cookie });
  },
  update: ({ id, cookie, vendorId, ...params }: IProviderParams & { cookie: string; vendorId?: string | number }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return HTTPService.getInstance().post(API_PATH.provider + "/" + id + qs, params, { Cookie: cookie });
  },
  create: ({ cookie, vendorId, ...params }: any) => {
    const body = vendorId !== undefined ? { ...params, vendorId } : params;
    return HTTPService.getInstance().post(API_PATH.provider, body, { Cookie: cookie });
  },
};

export { providerService };
