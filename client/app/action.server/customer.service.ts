import { HTTPService } from "~/http/index.server";
import { BaseQueryParams } from "~/types/common";
import { ICustomer, ICustomerCreate, ICustomerUpdate } from "~/types/customer";

const API_PATH = {
  customers: "/customers",
};

interface ICustomerQueryParams extends BaseQueryParams {
  search?: string;
}

const http = HTTPService.getInstance();

const customerService = {
  getCustomers: (searchParams: ICustomerQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get<{ data: ICustomer[]; total: number }>(API_PATH.customers + "?" + qs.toString());
  },

  getCustomerById: (id: number | string) => {
    return http.get<{ data: ICustomer }>(`${API_PATH.customers}/${id}`);
  },

  createCustomer: (data: ICustomerCreate) => {
    return http.post<ICustomer, Omit<ICustomerCreate, "vendorId">>(API_PATH.customers, data);
  },

  updateCustomer: ({ id, ...data }: ICustomerUpdate) => {
    return http.put<ICustomer, Record<string, any>>(`${API_PATH.customers}/${id}`, data);
  },

  deleteCustomer: (id: number) => {
    return http.delete<{ message: string }>(`${API_PATH.customers}/${id}`);
  },
};

export { customerService };
