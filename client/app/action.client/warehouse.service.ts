import { http } from "~/http";

const API_PATH = {
  warehouse: "/warehouses",
  inventory: "/inventories",
};

const warehouseService = {
  getWareHouses: (vendorId: string) => {
    return http.get(API_PATH.warehouse + `?vendorId=${vendorId}`);
  },

  getInventoryFromWareHouseId: (documentId: string) => {
    const params = new URLSearchParams({});
    params.append(`filters[warehouses][documentId][$eq]`, documentId);
    return http.get(API_PATH.inventory + "?" + params.toString());
  },
  getWareHouseById: ({ id, vendor }: any) => {
    const params = new URLSearchParams({
      vendor,
    });
    return http.get(API_PATH.warehouse + "/" + id + "?" + params.toString());
  },
};

export { warehouseService };
