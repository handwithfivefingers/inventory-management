import { http } from "~/http";
import { IShift, IShiftQueryParams } from "~/types/shift";

const API_PATH = {
  shift: "/shift",
};

const shiftService = {
  get: (searchParams: IShiftQueryParams & { cookie?: string; vendorId?: string | number }) => {
    const { cookie, vendorId, ...rest } = searchParams as any;
    const merged: any = { ...rest };
    if (vendorId !== undefined && vendorId !== null && `${vendorId}` !== "") merged.vendorId = vendorId;
    const qs = new URLSearchParams(merged as any);
    const headers = cookie ? { cookie } : undefined;
    return http.get<{ data: IShift[]; total: number }>(API_PATH.shift + "?" + qs.toString(), headers);
  },
  getCurrent: (warehouseId?: string, opts?: { cookie?: string; vendorId?: string | number }) => {
    const params = new URLSearchParams();
    if (warehouseId) params.set("warehouseId", warehouseId);
    if (opts?.vendorId !== undefined && opts?.vendorId !== null && `${opts.vendorId}` !== "") params.set("vendorId", `${opts.vendorId}`);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const headers = opts?.cookie ? { cookie: opts.cookie } : undefined;
    return http.get<{ data: IShift | null }>(`${API_PATH.shift}/current${qs}`, headers);
  },
  getById: (id: string | number, opts?: { cookie?: string; vendorId?: string | number }) => {
    const qs = opts?.vendorId !== undefined && opts?.vendorId !== null && `${opts.vendorId}` !== "" ? `?vendorId=${opts.vendorId}` : "";
    const headers = opts?.cookie ? { cookie: opts.cookie } : undefined;
    return http.get<{ data: IShift }>(`${API_PATH.shift}/${id}${qs}`, headers);
  },
  open: (params: Partial<IShift> & { cookie?: string; vendorId?: string | number }) => {
    const { cookie, vendorId, ...body } = params as any;
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    const headers = cookie ? { cookie } : undefined;
    return http.post(`${API_PATH.shift}/open${qs}`, body, headers);
  },
  close: (id: string | number, params: { closingCash?: number; note?: string; cookie?: string; vendorId?: string | number }) => {
    const { cookie, vendorId, ...body } = params as any;
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    const headers = cookie ? { cookie } : undefined;
    return http.post(`${API_PATH.shift}/${id}/close${qs}`, body, headers);
  },
};

export { shiftService };
