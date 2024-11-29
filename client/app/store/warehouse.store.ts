import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { IWareHouse } from "~/types/warehouse";
// import type {} from "@redux-devtools/extension"; // required for devtools typing
// import { composeWithDevTools } from "@redux-devtools/extension";

interface IWareHouseState {
  warehouse?: IWareHouse;
  updateWarehouse: (warehouse: IWareHouse) => void;
}

export const useWarehouse = create<IWareHouseState>()(
  devtools(
    persist(
      (set) => ({
        warehouse: undefined,
        updateWarehouse: (warehouse) => set((state) => ({ warehouse })),
      }),
      {
        name: "warehouses-storage",
      }
    )
  )
);
