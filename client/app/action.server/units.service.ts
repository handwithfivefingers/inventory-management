import { HTTPService } from "~/http";
import { IUnit, IUnitParams, IUnitQueryParams } from "~/types/unit";

const API_PATH = {
  units: "/units",
};

const unitsService = {
  get: ({ cookie: Cookie, ...searchParams }: IUnitQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return HTTPService.getInstance().get<IUnit[]>(API_PATH.units + "?" + qs.toString(), { Cookie });
  },
  create: ({ cookie: Cookie, ...params }: IUnitParams) => {
    return HTTPService.getInstance().post(API_PATH.units, params, { Cookie });
  },
  getById: ({ cookie: Cookie, id, vendor }: { id: string | number; cookie: string; vendor: string }) => {
    const params = new URLSearchParams({ vendor });
    return HTTPService.getInstance().get<IUnit>(API_PATH.units + "/" + id + "?" + params.toString(), { Cookie });
  },
  update: ({ cookie: Cookie, id, ...params }: IUnitParams) => {
    return HTTPService.getInstance().post(`${API_PATH.units}/${id}`, params, { Cookie });
  },
};

export { unitsService };
