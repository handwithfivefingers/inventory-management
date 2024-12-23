import { http } from "~/http";
import { IFinancialQueryParams } from "~/types/financial";

const API_PATH = {
  financial: "/financial",
};

const financialService = {
  get: (searchParams: IFinancialQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get(API_PATH.financial + "?" + qs.toString());
  },
};

export { financialService };
