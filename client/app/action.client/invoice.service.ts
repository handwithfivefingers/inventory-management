import { http } from "~/http";
import { BaseQueryParams, IResponse } from "~/types/common";
import {
  IInvoice,
  IInvoiceCreate,
  IInvoiceUpdate,
  IInvoiceStatusUpdate,
} from "~/types/invoice";

const API_PATH = {
  invoices: "/invoices",
};

interface IInvoiceParams extends BaseQueryParams {
  search?: string;
  vendorId?: number;
  status?: string;
  customerId?: number;
}

const invoiceService = {
  getInvoices: (params?: IInvoiceParams): Promise<IResponse<IInvoice[] | undefined>> => {
    const qs = new URLSearchParams(params as any);
    return http.get(API_PATH.invoices + "?" + qs.toString());
  },

  getInvoiceById: (id: number): Promise<IResponse<IInvoice | undefined>> => {
    return http.get(`${API_PATH.invoices}/${id}`);
  },

  createInvoice: (data: IInvoiceCreate): Promise<IResponse<IInvoice | undefined>> => {
    return http.post(API_PATH.invoices, { data });
  },

  updateInvoice: (params: IInvoiceUpdate): Promise<IResponse<IInvoice | undefined>> => {
    const { id, ...data } = params;
    return http.put(`${API_PATH.invoices}/${id}`, { data });
  },

  deleteInvoice: (id: number): Promise<IResponse<{ message: string } | undefined>> => {
    return http.delete(`${API_PATH.invoices}/${id}`);
  },

  updateInvoiceStatus: (params: IInvoiceStatusUpdate): Promise<IResponse<IInvoice | undefined>> => {
    const { id, ...data } = params;
    return http.put(`${API_PATH.invoices}/${id}/status`, { data });
  },
};

export { invoiceService };
export default invoiceService;
