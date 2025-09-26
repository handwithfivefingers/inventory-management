import { HTTPService } from "~/http";
import { IResponse } from "~/types/common";
import { IProduct } from "~/types/product";

const API_PATH = {
  history: "/history",
};
const historyService = {
  getProductHistory: ({ id, warehouseId, cookie }: { id: string; warehouseId: string[]; cookie: string }) => {
    const qs = new URLSearchParams({});
    for (const item of warehouseId) qs.append("warehouseId", item);
    return HTTPService.getInstance().get<IProduct[]>(API_PATH.history + `/${id}?${qs.toString()}`, {Cookie:cookie});
  },
};

export { historyService };
