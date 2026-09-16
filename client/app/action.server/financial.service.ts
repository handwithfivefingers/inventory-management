import { http } from "~/http/index.server";
import { IFinancialQueryParams, IFinancialRecord, IFinancialReport } from "~/types/financial";

const API_PATH = {
  financial: "/financial",
};

const sanitizeParams = (params: Record<string, any>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s === "" || s === "null" || s === "undefined") continue;
    out[k] = s;
  }
  return out;
};

const financialService = {
  getVouchers: (searchParams: IFinancialQueryParams) => {
    const qs = new URLSearchParams(sanitizeParams(searchParams as any));
    return http.get<{ data: IFinancialRecord[]; total: number }>(API_PATH.financial + "?" + qs.toString());
  },
  getVoucherById: (id: string | number) => {
    return http.get<{ data: IFinancialRecord }>(`${API_PATH.financial}/${id}`);
  },
  createVoucher: (params: any) => {
    return http.post(API_PATH.financial, params);
  },
  getReport: (searchParams: IFinancialQueryParams) => {
    const qs = new URLSearchParams(sanitizeParams(searchParams as any));
    return http.get<{ data: IFinancialReport }>(`${API_PATH.financial}/report?` + qs.toString());
  },
};

export { financialService };
