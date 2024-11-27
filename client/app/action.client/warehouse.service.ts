import { http } from "~/http";

const API_PATH = {
  warehouse: "/warehouses",
};

const warehouseService = {
  getWareHouses: () => {
    return http.get(API_PATH.warehouse);
  },
  getWareHouseById: (documentId: string) => {
    const params = new URLSearchParams({});
    // params.append(`populate[0]`, "productDetails");
    // params.append(`populate[1]`, "history");
    return http.get(API_PATH.warehouse + "/" + documentId + "?" + params.toString());
  },
};

export { warehouseService };
