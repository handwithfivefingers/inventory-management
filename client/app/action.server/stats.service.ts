import { http } from "~/http";
import { IDashboardQueryParams, IDashboardStats } from "~/types/stats";

const API_PATH = {
  stats: "/stats",
};

const statsService = {
  getDashboard: ({ cookie, ...searchParams }: IDashboardQueryParams) => {
    const qs = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== "") qs.set(key, String(value));
    });
    const options = cookie ? { cookie } : undefined;
    return http.get<{ data: IDashboardStats }>(`${API_PATH.stats}/dashboard?${qs.toString()}`, options);
  },
};

export { statsService };
