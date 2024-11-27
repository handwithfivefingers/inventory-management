import { http } from "~/http";




const API_PATH = {
  warehouse: "/warehouses",
  inventory: "/inventories",
};

const warehouseService = {
  getWareHouses: () => {
    return http.get(API_PATH.warehouse);
  },

  getInventoryFromWareHouseId: (documentId: string) => {
    const params = new URLSearchParams({});
    params.append(`filters[warehouses][documentId][$eq]`, documentId);
    return http.get(API_PATH.inventory + "?" + params.toString());
  },
  getWareHouseById: (documentId: string) => {
    const params = new URLSearchParams({});
    return http.get(API_PATH.warehouse + "/" + documentId + "?" + params.toString());
  },
};

export { warehouseService };
