import { http } from "~/http";
import { IStaff, IStaffQueryParams } from "~/types/staff";

const API_PATH = {
  staff: "/staff",
};

const staffService = {
  get: (searchParams: IStaffQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get<{ data: IStaff[]; total: number }>(API_PATH.staff + "?" + qs.toString());
  },
  getById: (id: string | number) => {
    return http.get<{ data: IStaff }>(`${API_PATH.staff}/${id}`);
  },
  create: (params: Partial<IStaff>) => {
    return http.post(API_PATH.staff, params);
  },
  update: (id: string | number, params: Partial<IStaff>) => {
    return http.put(`${API_PATH.staff}/${id}`, params);
  },
  remove: (id: string | number) => {
    return http.delete(`${API_PATH.staff}/${id}`);
  },
};

export { staffService };
