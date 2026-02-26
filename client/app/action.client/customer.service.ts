import { http } from "~/http";
import { BaseQueryParams, IResponse } from "~/types/common";
import { ICustomer, ICustomerCreate, ICustomerUpdate } from "~/types/customer";

const API_PATH = {
  customers: "/customers",
};

interface ICustomerParams extends BaseQueryParams {
  search?: string;
  vendorId?: number;
}

const customerService = {
  getCustomers: (params?: ICustomerParams): Promise<IResponse<ICustomer[] | undefined>> => {
    const qs = new URLSearchParams(params as any);
    return http.get(API_PATH.customers + "?" + qs.toString());
  },

  getCustomerById: (id: number): Promise<IResponse<ICustomer | undefined>> => {
    return http.get(`${API_PATH.customers}/${id}`);
  },

  createCustomer: (data: ICustomerCreate): Promise<IResponse<ICustomer>> => {
    return http.post(API_PATH.customers, { data });
  },

  updateCustomer: (params: ICustomerUpdate): Promise<IResponse<ICustomer>> => {
    const { id, ...data } = params;
    return http.put(`${API_PATH.customers}/${id}`, { data });
  },

  deleteCustomer: (id: number): Promise<IResponse<{ message: string } | undefined>> => {
    return http.delete(`${API_PATH.customers}/${id}`);
  },
};

export { customerService };
export default customerService;
