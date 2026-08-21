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

  getCustomerById: ({ id, cookie: Cookie }: { id: number | string; cookie: string }) => {
    return http.get<{ data: ICustomer }>(`${API_PATH.customers}/${id}`, { Cookie });
  },

  createCustomer: ({ cookie: Cookie, ...data }: { cookie: string } & ICustomerCreate) => {
    return http.post<ICustomer, Omit<ICustomerCreate, "vendorId"> & { vendorId?: number | string }>(
      API_PATH.customers,
      data,
      { Cookie }
    );
  },

  updateCustomer: ({ id, cookie: Cookie, ...data }: ICustomerUpdate & { cookie: string }) => {
    return http.put<ICustomer, Record<string, any>>(`${API_PATH.customers}/${id}`, data, { Cookie });
  },

  deleteCustomer: ({ id, cookie: Cookie }: { id: number; cookie: string }) => {
    return http.delete<{ message: string }>(`${API_PATH.customers}/${id}`, { Cookie });
  },
};

export { customerService };
