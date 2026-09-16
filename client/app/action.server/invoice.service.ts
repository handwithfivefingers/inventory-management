import { HTTPService } from "~/http/index.server";
import { BaseQueryParams } from "~/types/common";
import { IInvoice, IInvoiceCreate, IInvoiceStatusUpdate, IInvoiceUpdate } from "~/types/invoice";

const API_PATH = {
  invoices: "/invoices",
};

interface IInvoiceQueryParams extends BaseQueryParams {
  search?: string;
  status?: string;
  customerId?: number;
  orderId?: number | string;
}

const http = HTTPService.getInstance();

const invoiceService = {
  getInvoices: (searchParams: IInvoiceQueryParams) => {
    const qs = new URLSearchParams(searchParams as any);
    return http.get<{ data: IInvoice[]; total: number }>(API_PATH.invoices + "?" + qs.toString());
  },

  getInvoiceById: (id: number | string) => {
    return http.get<{ data: IInvoice }>(`${API_PATH.invoices}/${id}`);
  },

  createInvoice: (data: IInvoiceCreate) => {
    return http.post<IInvoice, IInvoiceCreate>(API_PATH.invoices, data);
  },

  updateInvoice: ({ id, ...data }: IInvoiceUpdate) => {
    return http.put<IInvoice, Record<string, any>>(`${API_PATH.invoices}/${id}`, data);
  },

  deleteInvoice: (id: number) => {
    return http.delete<{ message: string }>(`${API_PATH.invoices}/${id}`);
  },

  updateInvoiceStatus: ({ id, ...data }: Omit<IInvoiceStatusUpdate, "id"> & { id: number }) => {
    return http.put<IInvoice, Record<string, any>>(`${API_PATH.invoices}/${id}/status`, data);
  },
};

export { invoiceService };
