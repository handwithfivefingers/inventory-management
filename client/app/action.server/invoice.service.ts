import { HTTPService } from "~/http";
import { BaseQueryParams } from "~/types/common";
import { IInvoice, IInvoiceCreate, IInvoiceStatusUpdate, IInvoiceUpdate } from "~/types/invoice";

const API_PATH = {
  invoices: "/invoices",
};

interface IInvoiceQueryParams extends BaseQueryParams {
  search?: string;
  vendorId?: number | string;
  status?: string;
  customerId?: number;
}

const http = HTTPService.getInstance();

const invoiceService = {
  getInvoices: ({ cookie: Cookie, ...searchParams }: IInvoiceQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get<{ data: IInvoice[]; total: number }>(API_PATH.invoices + "?" + qs.toString(), { Cookie });
  },

  getInvoiceById: ({ id, cookie: Cookie }: { id: number | string; cookie: string }) => {
    return http.get<{ data: IInvoice }>(`${API_PATH.invoices}/${id}`, { Cookie });
  },

  createInvoice: ({ cookie: Cookie, ...data }: { cookie: string } & IInvoiceCreate) => {
    return http.post<IInvoice, IInvoiceCreate>(API_PATH.invoices, data, { Cookie });
  },

  updateInvoice: ({ id, cookie: Cookie, ...data }: IInvoiceUpdate & { cookie: string }) => {
    return http.put<IInvoice, Record<string, any>>(`${API_PATH.invoices}/${id}`, data, { Cookie });
  },

  deleteInvoice: ({ id, cookie: Cookie }: { id: number; cookie: string }) => {
    return http.delete<{ message: string }>(`${API_PATH.invoices}/${id}`, { Cookie });
  },

  updateInvoiceStatus: ({ id, cookie: Cookie, ...data }: Omit<IInvoiceStatusUpdate, "id"> & { id: number; cookie: string }) => {
    return http.put<IInvoice, Record<string, any>>(`${API_PATH.invoices}/${id}/status`, data, { Cookie });
  },
};

export { invoiceService };
