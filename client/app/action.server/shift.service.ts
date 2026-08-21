import { http } from "~/http";
import { IShift, IShiftQueryParams } from "~/types/shift";

const API_PATH = {
  shift: "/shift",
};

const shiftService = {
  get: (searchParams: IShiftQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get<{ data: IShift[]; total: number }>(API_PATH.shift + "?" + qs.toString());
  },
  getCurrent: (warehouseId?: string) => {
    const qs = warehouseId ? `?warehouseId=${warehouseId}` : "";
    return http.get<{ data: IShift | null }>(`${API_PATH.shift}/current${qs}`);
  },
  getById: (id: string | number) => {
    return http.get<{ data: IShift }>(`${API_PATH.shift}/${id}`);
  },
  open: (params: Partial<IShift>) => {
    return http.post(`${API_PATH.shift}/open`, params);
  },
  close: (id: string | number, params: { closingCash?: number; note?: string }) => {
    return http.post(`${API_PATH.shift}/${id}/close`, params);
  },
};

export { shiftService };
