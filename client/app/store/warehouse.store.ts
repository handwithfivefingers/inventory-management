import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { IWareHouse } from "~/types/warehouse";
// import type {} from "@redux-devtools/extension"; // required for devtools typing
// import { composeWithDevTools } from "@redux-devtools/extension";

interface IWareHouseState {
  warehouse?: IWareHouse;
}

type Actions = {
  updateWarehouse: (warehouse: IWareHouse) => void;
  reset: () => void;
};
const initialState: IWareHouseState = {
  warehouse: undefined,
};

export const useWarehouse = create<IWareHouseState & Actions>()(
  devtools(
    persist(
      (set) => ({
        warehouse: undefined,
        updateWarehouse: (warehouse) => set((state) => ({ warehouse })),
        reset: () => set(initialState),
      }),
      {
        name: "warehouses-storage",
      }
    )
  )
);
