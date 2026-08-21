import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { IUser, IRole, IPermission } from "~/types/user";
import { IVendor } from "~/types/vendor";
import { IWareHouse } from "~/types/warehouse";

interface IUserState {
  user?: IUser;
  roles?: IRole[];
  vendors?: IVendor[];
  activeVendor?: IVendor;
  activeWarehouse?: IWareHouse;
}

type Actions = {
  /**
   * Single source of truth. Called from the `_layout` loader result whenever
   * `getMe` runs (first paint, revalidation). Always refreshes `user`,
   * `roles` and `vendors`, and re-verifies permissions implicitly because they
   * are derived from `roles`.
   *
   * The active vendor/warehouse selection:
   *  - is preserved when it is still valid for the returned vendors (so a
   *    `getMe` refresh does not clobber the user's current selection);
   *  - otherwise falls back to the persisted cookie selection
   *    (`selectedVendorId`/`selectedWarehouseId`, which drive server-side
   *    fetching) and only then to the first vendor / warehouse.
   */
  syncAuth: (data: {
    user: IUser;
    roles?: IRole[];
    vendors?: IVendor[];
    selectedVendorId?: string | number;
    selectedWarehouseId?: string | number;
  }) => void;
  setVendor: (vendor: IVendor) => void;
  setWarehouse: (warehouse: IWareHouse) => void;
  reset: () => void;
};

const initialState: IUserState = {
  user: undefined,
  roles: undefined,
  vendors: undefined,
  activeVendor: undefined,
  activeWarehouse: undefined,
};

const pickDefaultWarehouse = (vendor?: IVendor): IWareHouse | undefined => {
  if (!vendor?.warehouses?.length) return undefined;
  return vendor.warehouses.find((w) => w.isMain) ?? vendor.warehouses[0];
};

const useUser = create<IUserState & Actions>()(
  devtools((set) => ({
    ...initialState,
    syncAuth: ({ user, roles, vendors, selectedVendorId, selectedWarehouseId }) =>
      set((state) => {
        const nextRoles = roles ?? user.roles ?? state.roles;
        const nextVendors = vendors ?? user.vendors ?? state.vendors;

        const hasSelection = !!state.activeVendor;

        // Preserve the current selection if it is still valid for the new data.
        // On a fresh load (no current selection) honor the persisted cookie
        // choice so the displayed vendor matches what server-side fetches use.
        const fallbackVendor =
          nextVendors?.find((v) => v.id === selectedVendorId) ?? nextVendors?.[0];
        const activeVendor =
          hasSelection && nextVendors?.some((v) => v.id === state.activeVendor!.id)
            ? state.activeVendor
            : fallbackVendor;

        const selectionStillValid =
          hasSelection &&
          state.activeWarehouse &&
          activeVendor?.warehouses?.some((w) => w.id === state.activeWarehouse!.id);

        let activeWarehouse: IWareHouse | undefined;
        if (selectionStillValid) {
          activeWarehouse = state.activeWarehouse;
        } else if (activeVendor) {
          activeWarehouse =
            activeVendor.warehouses?.find((w) => w.id === selectedWarehouseId) ??
            pickDefaultWarehouse(activeVendor);
        }

        return {
          user,
          roles: nextRoles,
          vendors: nextVendors,
          activeVendor,
          activeWarehouse,
        };
      }),
    setVendor: (vendor) =>
      set(() => ({ activeVendor: vendor, activeWarehouse: pickDefaultWarehouse(vendor) })),
    setWarehouse: (warehouse) => set(() => ({ activeWarehouse: warehouse })),
    reset: () => set(initialState),
  })),
);

export { useUser };
