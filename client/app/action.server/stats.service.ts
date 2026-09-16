import { http } from "~/http/index.server";
import { IDashboardQueryParams, IDashboardStats } from "~/types/stats";

const API_PATH = {
  stats: "/stats",
};

const statsService = {
  getDashboard: (searchParams: IDashboardQueryParams) => {
    const qs = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== "") qs.set(key, String(value));
    });
    return http.get<{ data: IDashboardStats }>(`${API_PATH.stats}/dashboard?${qs.toString()}`);
  },
};

export { statsService };
