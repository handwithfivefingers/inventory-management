import { HTTPService } from "~/http";
import { IWareHouse } from "~/types/warehouse";

const API_PATH = {
  warehouse: "/warehouses",
  inventory: "/inventories",
};

interface IWarehouseById {
  id: string | number;
  vendorId: string;
  cookie: string;
}

interface IWarehouseParams extends Omit<IWarehouseById, "id"> {
  page: string;
  pageSize: string;
}

const warehouseService = {
  getWareHouses: ({ cookie, ...restParams }: IWarehouseParams) => {
    const params = new URLSearchParams(restParams);
    return HTTPService.getInstance().get<{ data: IWareHouse[]; total: number }>(
      API_PATH.warehouse + `?${params.toString()}`,
      {
        Cookie: cookie,
      },
    );
  },
  getInventoryFromWareHouseId: (documentId: string) => {
    const params = new URLSearchParams({});
    params.append(`filters[warehouses][documentId][$eq]`, documentId);
    return HTTPService.getInstance().get(API_PATH.inventory + "?" + params.toString());
  },
  getWareHouseById: ({ id, vendorId, cookie: Cookie }: IWarehouseById) => {
    const params = new URLSearchParams({
      vendorId,
    });
    return HTTPService.getInstance().get<{ data: IWareHouse }>(
      API_PATH.warehouse + "/" + id + "?" + params.toString(),
      {
        Cookie,
      },
    );
  },
  createWarehouse: ({ cookie, ...params }: Partial<IWareHouse> & { cookie: string }) => {
    return HTTPService.getInstance().post(API_PATH.warehouse, params, { Cookie: cookie });
  },
  updateWarehouse: ({
    id,
    cookie,
    vendorId,
    ...params
  }: Partial<IWareHouse> & { id: string | number; cookie: string; vendorId?: string }) => {
    const qs = vendorId ? `?vendorId=${vendorId}` : "";
    return HTTPService.getInstance().put(API_PATH.warehouse + "/" + id + qs, params, { Cookie: cookie });
  },
};

export { warehouseService };
