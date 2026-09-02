import { HTTPService } from "~/http";
import { IUnit, IUnitParams, IUnitQueryParams } from "~/types/unit";

const API_PATH = {
  units: "/units",
};

const unitsService = {
  get: ({ cookie: Cookie, ...searchParams }: IUnitQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return HTTPService.getInstance().get<{ data: IUnit[]; total: number }>(API_PATH.units + "?" + qs.toString(), {
      Cookie,
    });
  },
  create: ({ cookie: Cookie, ...params }: IUnitParams) => {
    return HTTPService.getInstance().post(API_PATH.units, params, { Cookie });
  },
  getById: ({
    cookie: Cookie,
    id,
    vendor,
    vendorId,
  }: {
    id: string | number;
    cookie: string;
    vendor?: string;
    vendorId?: string | number;
  }) => {
    const effectiveVendor = vendor ?? (vendorId !== undefined ? `${vendorId}` : undefined);
    const params = new URLSearchParams({});
    if (effectiveVendor) {
      params.set("vendor", effectiveVendor);
      params.set("vendorId", effectiveVendor);
    }
    const qs = params.toString();
    return HTTPService.getInstance().get<{ data: IUnit }>(API_PATH.units + "/" + id + (qs ? "?" + qs : ""), { Cookie });
  },
  update: ({ cookie: Cookie, id, vendorId, ...params }: IUnitParams & { vendorId?: string | number }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return HTTPService.getInstance().post(`${API_PATH.units}/${id}${qs}`, params, { Cookie });
  },
};

export { unitsService };
