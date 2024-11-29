import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { IVendor } from "~/types/vendor";
// import type {} from "@redux-devtools/extension"; // required for devtools typing

interface IVendorState {
  vendors?: IVendor[];
  defaultActive?: IVendor;
  updateVendor: (vendors: IVendor[]) => void;
  activeVendor: (vendor: IVendor) => void;
}

export const useVendor = create<IVendorState>()(
  devtools(
    persist(
      (set) => ({
        vendors: [],
        updateVendor: (vendors) => set((state) => ({ vendors })),
        activeVendor: (vendor) => set((state) => ({ ...state, defaultActive: vendor })),
      }),
      {
        name: "vendors-storage",
      }
    )
  )
);
