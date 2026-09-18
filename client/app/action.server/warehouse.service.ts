import { HTTPService } from "~/http/index.server";
import { IWareHouse } from "~/types/warehouse";

const API_PATH = {
  warehouse: "/warehouses",
  inventory: "/inventories",
  transfer: "/warehouses/transfer",
};

interface IWarehouseById {
  id: string | number;
}

interface IWarehouseParams {
  page: string;
  pageSize: string;
}

const warehouseService = {
  getWareHouses: (params: IWarehouseParams) => {
    const qs = new URLSearchParams(params as any);
    return HTTPService.getInstance().get<{ data: IWareHouse[]; total: number }>(
      API_PATH.warehouse + `?${qs.toString()}`
    );
  },
  // ???
  // getInventoryFromWareHouseId: (documentId: string) => {
  //   const params = new URLSearchParams({});
  //   params.append(`filters[warehouses][documentId][$eq]`, documentId);
  //   return HTTPService.getInstance().get(API_PATH.inventory + "?" + params.toString());
  // },
  getWareHouseById: (id: string | number) => {
    return HTTPService.getInstance().get<{ data: IWareHouse }>(
      API_PATH.warehouse + "/" + id
    );
  },
  createWarehouse: (params: Partial<IWareHouse>) => {
    return HTTPService.getInstance().post(API_PATH.warehouse, params);
  },
  updateWarehouse: ({
    id,
    ...params
  }: Partial<IWareHouse> & { id: string | number }) => {
    return HTTPService.getInstance().put(API_PATH.warehouse + "/" + id, params);
  },
  deleteWarehouse: (id: string | number) => {
    return HTTPService.getInstance().delete(API_PATH.warehouse + "/" + id);
  },
};

export interface ITransferItem {
  productId: number;
  variantId?: number | null;
  quantity: number;
}

export const transferService = {
  /** POST /warehouses/transfer — move stock between two warehouses */
  createTransfer: (params: {
    fromWarehouseId: number;
    toWarehouseId: number;
    note?: string;
    items: ITransferItem[];
  }) => {
    return HTTPService.getInstance().post(API_PATH.transfer, params);
  },
};

export { warehouseService };
