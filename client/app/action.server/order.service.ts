import { http } from "~/http";

const API_PATH = {
  orders: "/orders",
};

const orderService = {
  getOrders: () => {
    return http.get(API_PATH.orders);
  },
};

export { orderService };
