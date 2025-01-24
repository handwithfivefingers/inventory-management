import { http } from "~/http";
import { IResponse } from "~/types/common";
import { IProduct } from "~/types/product";

const API_PATH = {
  history: "/history",
};
const historyService = {
  getProductHistory: (id: string | number): Promise<IResponse<IProduct[]>> => {
    return http.get(API_PATH.history + `/${id}`);
  },
};

export { historyService };
