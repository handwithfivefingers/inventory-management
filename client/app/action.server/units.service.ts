import { HTTPService } from "~/http/index.server";
import { IUnit, IUnitParams, IUnitQueryParams } from "~/types/unit";

const API_PATH = {
  units: "/units",
};

const unitsService = {
  get: (searchParams: IUnitQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return HTTPService.getInstance().get<{ data: IUnit[]; total: number }>(API_PATH.units + "?" + qs.toString(), {});
  },
  create: (params: IUnitParams) => {
    return HTTPService.getInstance().post(API_PATH.units, params);
  },
  getById: (id: string | number) => {
    return HTTPService.getInstance().get<{ data: IUnit }>(API_PATH.units + "/" + id);
  },
  update: ({ id, ...params }: IUnitParams) => {
    return HTTPService.getInstance().post(`${API_PATH.units}/${id}`, params);
  },
};

export { unitsService };
