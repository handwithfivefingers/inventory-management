import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { IVendor } from "~/types/vendor";
// import type {} from "@redux-devtools/extension"; // required for devtools typing

interface IVendorState {
  vendors?: IVendor[];
  defaultActive?: IVendor;
}
type Actions = {
  updateVendor: (vendors: IVendor[]) => void;
  activeVendor: (vendor: IVendor) => void;
  reset: () => void;
};
const initialState: IVendorState = {
  vendors: undefined,
  defaultActive: undefined,
};
export const useVendor = create<IVendorState & Actions>()(
  devtools(
    persist(
      (set) => ({
        vendors: [],
        updateVendor: (vendors) => set((state) => ({ vendors })),
        activeVendor: (vendor) => set((state) => ({ ...state, defaultActive: vendor })),
        reset: () => set(initialState),
      }),
      {
        name: "vendors-storage",
      }
    )
  )
);
