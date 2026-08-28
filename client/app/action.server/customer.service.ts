import { HTTPService } from "~/http";
import { BaseQueryParams } from "~/types/common";
import { ICustomer, ICustomerCreate, ICustomerUpdate } from "~/types/customer";

const API_PATH = {
  customers: "/customers",
};

interface ICustomerQueryParams extends BaseQueryParams {
  search?: string;
  vendorId?: number | string;
}

const http = HTTPService.getInstance();

const customerService = {
  getCustomers: ({ cookie: Cookie, ...searchParams }: ICustomerQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get<{ data: ICustomer[]; total: number }>(API_PATH.customers + "?" + qs.toString(), { Cookie });
  },

  getCustomerById: ({
    id,
    cookie: Cookie,
    vendorId,
  }: {
    id: number | string;
    cookie: string;
    vendorId?: string | number;
  }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.get<{ data: ICustomer }>(`${API_PATH.customers}/${id}${qs}`, { Cookie });
  },

  createCustomer: ({ cookie: Cookie, ...data }: { cookie: string } & ICustomerCreate) => {
    return http.post<ICustomer, Omit<ICustomerCreate, "vendorId"> & { vendorId?: number | string }>(
      API_PATH.customers + `?vendorId=${data.vendorId}`,
      data,
      { Cookie },
    );
  },

  updateCustomer: ({ id, cookie: Cookie, ...data }: ICustomerUpdate & { cookie: string }) => {
    return http.put<ICustomer, Record<string, any>>(`${API_PATH.customers}/${id}`, data, { Cookie });
  },

  deleteCustomer: ({ id, cookie: Cookie, vendorId }: { id: number; cookie: string; vendorId?: string | number }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.delete<{ message: string }>(`${API_PATH.customers}/${id}${qs}`, { Cookie });
  },
};

export { customerService };
