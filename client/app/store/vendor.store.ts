import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { IVendor } from "~/types/vendor";
import { IWareHouse } from "~/types/warehouse";
// import type {} from "@redux-devtools/extension"; // required for devtools typing

interface IVendorState {
  vendors?: IVendor[];
  activeVendor?: IVendor;
  activeWarehouse?: IWareHouse;
}
type Actions = {
  initialize: (vendors: IVendor[]) => void;
  setVendor: (vendor: IVendor) => void;
  setWarehouse: (vendor: IWareHouse) => void;
};
const initialState: IVendorState = {
  vendors: undefined,
  activeVendor: undefined,
  activeWarehouse: undefined,
};

export const useVendor = create<IVendorState & Actions>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        initialize: (vendors) => {
          let activeVendor = vendors[0];
          let activeWarehouse = undefined;
          if (activeVendor && activeVendor.warehouses?.length) {
            activeWarehouse = activeVendor.warehouses[0];
          }
          return set(() => ({ vendors, activeVendor, activeWarehouse }));
        },
        setVendor: (vendor) => set((state) => ({ activeVendor: vendor })),
        setWarehouse: (warehouse) => set((state) => ({ activeWarehouse: warehouse })),
      }),
      {
        name: "vendors-storage",
      }
    )
  )
);
