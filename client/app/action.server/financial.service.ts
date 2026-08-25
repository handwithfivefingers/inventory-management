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
  getVoucherById: (id: string | number) => {
    return http.get<{ data: IFinancialRecord }>(`${API_PATH.financial}/${id}`);
  },
  createVoucher: (params: any) => {
    return http.post(API_PATH.financial, params);
  },
  getReport: ({ cookie, ...searchParams }: IFinancialQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get<{ data: IFinancialReport }>(`${API_PATH.financial}/report?` + qs.toString(), { cookie });
  },
};

export { financialService };
