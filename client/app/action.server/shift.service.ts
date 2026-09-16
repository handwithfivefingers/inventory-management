import { http } from "~/http/index.server";
import { IShift, IShiftQueryParams } from "~/types/shift";

const API_PATH = {
  shift: "/shift",
};

const shiftService = {
  get: (searchParams: IShiftQueryParams) => {
    const qs = new URLSearchParams(searchParams as Record<string, string>);
    return http.get<{ data: IShift[]; total: number }>(API_PATH.shift + "?" + qs.toString());
  },
  getCurrent: () => {
    const params = new URLSearchParams();
    const qs = params.toString() ? `?${params.toString()}` : "";
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
