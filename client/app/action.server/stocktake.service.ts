import { HTTPService } from "~/http";

const API_PATH = {
  stocktake: "/stocktake",
};

interface IServiceParams {
  cookie: string;
  vendorId?: string;
  [key: string]: any;
}

/**
 * Stocktake (đồng kiểm kho) client service.
 * Lifecycle: start -> updateLines -> complete (or cancel).
 */
export const stocktakeService = {
  list: ({ cookie, ...params }: IServiceParams) => {
    const qs = new URLSearchParams(params);
    return HTTPService.getInstance().get(`${API_PATH.stocktake}?${qs.toString()}`, { Cookie: cookie });
  },
  getById: ({ id, cookie, vendorId }: { id: string | number; cookie: string; vendorId?: string }) => {
    const qs = vendorId ? `?vendorId=${vendorId}` : "";
    return HTTPService.getInstance().get(`${API_PATH.stocktake}/${id}${qs}`, { Cookie: cookie });
  },
  start: ({ cookie, vendorId, ...params }: IServiceParams) => {
    const qs = vendorId ? `?vendorId=${vendorId}` : "";
    return HTTPService.getInstance().post(`${API_PATH.stocktake}${qs}`, params, { Cookie: cookie });
  },
  updateLines: ({
    id,
    cookie,
    vendorId,
    ...params
  }: {
    id: string | number;
    cookie: string;
    vendorId?: string;
    lines: { id: number; actualQuantity?: number | null; note?: string }[];
  }) => {
    const qs = vendorId ? `?vendorId=${vendorId}` : "";
    return HTTPService.getInstance().put(`${API_PATH.stocktake}/${id}/lines${qs}`, params, { Cookie: cookie });
  },
  complete: ({ id, cookie, vendorId }: { id: string | number; cookie: string; vendorId?: string }) => {
    const qs = vendorId ? `?vendorId=${vendorId}` : "";
    return HTTPService.getInstance().post(`${API_PATH.stocktake}/${id}/complete${qs}`, {}, { Cookie: cookie });
  },
  cancel: ({ id, cookie, vendorId }: { id: string | number; cookie: string; vendorId?: string }) => {
    const qs = vendorId ? `?vendorId=${vendorId}` : "";
    return HTTPService.getInstance().post(`${API_PATH.stocktake}/${id}/cancel${qs}`, {}, { Cookie: cookie });
  },
};
