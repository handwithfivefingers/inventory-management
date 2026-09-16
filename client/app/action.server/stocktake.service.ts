import { HTTPService } from "~/http/index.server";

const API_PATH = {
  stocktake: "/stocktake",
};

interface IServiceParams {
  [key: string]: any;
}

/**
 * Stocktake (đồng kiểm kho) client service.
 * Lifecycle: start -> updateLines -> complete (or cancel).
 */
export const stocktakeService = {
  list: (params: IServiceParams) => {
    const qs = new URLSearchParams(params);
    return HTTPService.getInstance().get(`${API_PATH.stocktake}?${qs.toString()}`);
  },
  getById: (id: string | number) => {
    return HTTPService.getInstance().get(`${API_PATH.stocktake}/${id}`);
  },
  start: (params: IServiceParams) => {
    return HTTPService.getInstance().post(`${API_PATH.stocktake}`, params);
  },
  updateLines: ({
    id,
    ...params
  }: {
    id: string | number;
    lines: { id: number; actualQuantity?: number | null; note?: string }[];
  }) => {
    return HTTPService.getInstance().put(`${API_PATH.stocktake}/${id}/lines`, params);
  },
  complete: (id: string | number) => {
    return HTTPService.getInstance().post(`${API_PATH.stocktake}/${id}/complete`);
  },
  cancel: (id: string | number) => {
    return HTTPService.getInstance().post(`${API_PATH.stocktake}/${id}/cancel`);
  },
};
