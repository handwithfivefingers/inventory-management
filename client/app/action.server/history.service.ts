import { HTTPService } from "~/http/index.server";
import { IProduct } from "~/types/product";

const API_PATH = {
  history: "/history",
};
const historyService = {
  getProductHistory: (id: string | number) => {
    return HTTPService.getInstance().get<{ data: IProduct[] }>(API_PATH.history + `/${id}`, {});
  },
};

export { historyService };
