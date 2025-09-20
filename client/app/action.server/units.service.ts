import { HTTPService } from "~/http";
import { ICategory, ICategoryParams, ICategoryQueryParams } from "~/types/category";
import { IResponse } from "~/types/common";
import { IUnit, IUnitParams } from "~/types/unit";

const API_PATH = {
  units: "/units",
};

const unitsService = {
  get: (searchParams: ICategoryQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return HTTPService.getInstance().get<ICategory[]>(API_PATH.units + "?" + qs.toString());
  },
  create: (params: ICategoryParams) => {
    return HTTPService.getInstance().post(API_PATH.units, params);
  },
  getById: ({ id }: { id: string | number }) => {
    const params = new URLSearchParams({});
    return HTTPService.getInstance().get<ICategory>(API_PATH.units + "/" + id + "?" + params.toString());
  },
  update: ({ id, ...params }: IUnitParams) => {
    return HTTPService.getInstance().post(`${API_PATH.units}/${id}`, params);
  },
};

export { unitsService };
