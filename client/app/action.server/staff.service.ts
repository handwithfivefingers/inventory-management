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
  getById: (id: string | number, cookie: string, vendorId?: string | number) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.get<{ data: IStaff }>(`${API_PATH.staff}/${id}${qs}`, { cookie });
  },
  create: ({ cookie, vendorId, ...params }: Partial<IStaff> & { cookie: string; vendorId?: string | number }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.post(API_PATH.staff + qs, params, { cookie });
  },
  update: (id: string | number, params: Partial<IStaff> & { cookie?: string; vendorId?: string | number }) => {
    const { cookie, vendorId, ...body } = params as any;
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    const headers = cookie ? { cookie } : undefined;
    return http.put(`${API_PATH.staff}/${id}${qs}`, body, headers);
  },
  remove: (id: string | number, cookie: string, vendorId?: string | number) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.delete(`${API_PATH.staff}/${id}${qs}`, { cookie });
  },
};

export { staffService };
