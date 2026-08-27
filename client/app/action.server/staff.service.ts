import { http } from "~/http";
import { IStaff, IStaffQueryParams } from "~/types/staff";

const API_PATH = {
  staff: "/staff",
};

const staffService = {
  get: ({ cookie, ...searchParams }: IStaffQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get<{ data: IStaff[]; total: number }>(API_PATH.staff + "?" + qs.toString(), { cookie });
  },
  getById: (id: string | number, cookie: string) => {
    return http.get<{ data: IStaff }>(`${API_PATH.staff}/${id}`, { cookie });
  },
  create: ({ cookie, ...params }: Partial<IStaff> & { cookie: string }) => {
    return http.post(API_PATH.staff, params, { cookie });
  },
  update: (id: string | number, params: Partial<IStaff>) => {
    return http.put(`${API_PATH.staff}/${id}`, params);
  },
  remove: (id: string | number, cookie: string) => {
    return http.delete(`${API_PATH.staff}/${id}`, { cookie });
  },
};

export { staffService };
