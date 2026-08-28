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

  getInvoiceById: ({ id, cookie: Cookie, vendorId }: { id: number | string; cookie: string; vendorId?: string | number }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.get<{ data: IInvoice }>(`${API_PATH.invoices}/${id}${qs}`, { Cookie });
  },

  createInvoice: ({ cookie: Cookie, vendorId, ...data }: { cookie: string; vendorId?: string | number } & IInvoiceCreate) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.post<IInvoice, IInvoiceCreate>(API_PATH.invoices + qs, data, { Cookie });
  },

  updateInvoice: ({
    id,
    cookie: Cookie,
    vendorId,
    ...data
  }: IInvoiceUpdate & { cookie: string; vendorId?: string | number }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.put<IInvoice, Record<string, any>>(`${API_PATH.invoices}/${id}${qs}`, data, { Cookie });
  },

  deleteInvoice: ({ id, cookie: Cookie, vendorId }: { id: number; cookie: string; vendorId?: string | number }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.delete<{ message: string }>(`${API_PATH.invoices}/${id}${qs}`, { Cookie });
  },

  updateInvoiceStatus: ({
    id,
    cookie: Cookie,
    vendorId,
    ...data
  }: Omit<IInvoiceStatusUpdate, "id"> & { id: number; cookie: string; vendorId?: string | number }) => {
    const qs = vendorId !== undefined && vendorId !== null && `${vendorId}` !== "" ? `?vendorId=${vendorId}` : "";
    return http.put<IInvoice, Record<string, any>>(`${API_PATH.invoices}/${id}/status${qs}`, data, { Cookie });
  },
};

export { invoiceService };
