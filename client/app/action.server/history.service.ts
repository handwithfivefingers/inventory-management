import { HTTPService } from "~/http";
import { IResponse } from "~/types/common";
import { IProduct } from "~/types/product";

const API_PATH = {
  history: "/history",
};
const historyService = {
  getProductHistory: ({
    id,
    warehouseId,
    cookie,
    vendorId,
  }: {
    id: string;
    warehouseId: string[];
    cookie: string;
    vendorId?: string | number;
  }) => {
    const qs = new URLSearchParams({});
    for (const item of warehouseId) qs.append("warehouseId", item);
    if (vendorId !== undefined && vendorId !== null && `${vendorId}` !== "") qs.set("vendorId", `${vendorId}`);
    return HTTPService.getInstance().get<{ data: IProduct[] }>(API_PATH.history + `/${id}?${qs.toString()}`, {
      Cookie: cookie,
    });
  },
};

export { historyService };
