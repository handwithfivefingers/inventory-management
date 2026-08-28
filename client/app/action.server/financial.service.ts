import { http } from "~/http";
import { IFinancialQueryParams, IFinancialRecord, IFinancialReport } from "~/types/financial";

const API_PATH = {
  financial: "/financial",
};

const financialService = {
  getVouchers: ({ cookie, ...searchParams }: IFinancialQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get<{ data: IFinancialRecord[]; total: number }>(API_PATH.financial + "?" + qs.toString(), { cookie });
  },
  getVoucherById: (id: string | number, opts?: { cookie?: string; vendorId?: string | number }) => {
    const qs = opts?.vendorId !== undefined && opts?.vendorId !== null && `${opts.vendorId}` !== "" ? `?vendorId=${opts.vendorId}` : "";
    const headers = opts?.cookie ? { cookie: opts.cookie } : undefined;
    return http.get<{ data: IFinancialRecord }>(`${API_PATH.financial}/${id}${qs}`, headers);
  },
  createVoucher: (params: any, opts?: { cookie?: string; vendorId?: string | number }) => {
    const qs = opts?.vendorId !== undefined && opts?.vendorId !== null && `${opts.vendorId}` !== "" ? `?vendorId=${opts.vendorId}` : "";
    const headers = opts?.cookie ? { cookie: opts.cookie } : undefined;
    return http.post(API_PATH.financial + qs, params, headers);
  },
  getReport: ({ cookie, ...searchParams }: IFinancialQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get<{ data: IFinancialReport }>(`${API_PATH.financial}/report?` + qs.toString(), { cookie });
  },
};

export { financialService };
