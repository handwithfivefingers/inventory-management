import { HTTPService } from "~/http";

const API_PATH = {
  warehouse: "/warehouses",
  inventory: "/inventories",
};

const warehouseService = {
  getWareHouses: ({ vendor, cookie }: any) => {
    return HTTPService.getInstance().get(API_PATH.warehouse + `?vendorId=${vendor}`, { Cookie: cookie });
  },

  getInventoryFromWareHouseId: (documentId: string) => {
    const params = new URLSearchParams({});
    params.append(`filters[warehouses][documentId][$eq]`, documentId);
    return HTTPService.getInstance().get(API_PATH.inventory + "?" + params.toString());
  },
  getWareHouseById: ({ id, vendor }: any) => {
    const params = new URLSearchParams({
      vendor,
    });
    return HTTPService.getInstance().get(API_PATH.warehouse + "/" + id + "?" + params.toString());
  },
};

export { warehouseService };
