import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { IUser, IRole, IPermission } from "~/types/user";
import { IVendor } from "~/types/vendor";
import { IWareHouse } from "~/types/warehouse";

interface IUserState {
  user: IUser | undefined;
  jwt: string | undefined;
  roles?: IRole[];
  vendors?: IVendor[];
  activeVendor?: IVendor;
  activeWarehouse?: IWareHouse;
  defaultVendorId?: number | null;
  defaultWarehouseId?: number | null;
}

type Actions = {
  updateUser: (userInfo: IUser) => void;
  updateToken: (token: string) => void;
  initialize: (userData: {
    user: IUser;
    token: string;
    roles?: IRole[];
    vendors?: IVendor[];
    defaultVendorId?: number | null;
    defaultWarehouseId?: number | null;
  }) => void;
  setVendor: (vendor: IVendor) => void;
  setWarehouse: (warehouse: IWareHouse) => void;
  reset: () => void;
};

const initialState: IUserState = {
  user: undefined,
  jwt: undefined,
  roles: undefined,
  vendors: undefined,
  activeVendor: undefined,
  activeWarehouse: undefined,
  defaultVendorId: undefined,
  defaultWarehouseId: undefined,
};

const useUser = create<IUserState & Actions>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        updateUser: (userInfo) => set((state) => ({ ...state, user: userInfo })),
        updateToken: (token) => set((state) => ({ ...state, jwt: token })),
        initialize: (userData) => {
          const { user, token, roles, vendors, defaultVendorId, defaultWarehouseId } = userData;
          let activeVendor: IVendor | undefined;
          let activeWarehouse: IWareHouse | undefined;

          if (vendors && vendors.length > 0) {
            // Find the default vendor
            activeVendor = vendors.find((v) => v.id === defaultVendorId) || vendors[0];
            
            if (activeVendor.warehouses && activeVendor.warehouses.length > 0) {
              // Find the default warehouse (prioritize isMain or defaultWarehouseId)
              activeWarehouse = activeVendor.warehouses.find(
                (w) => w.id === defaultWarehouseId || w.isMain
              ) || activeVendor.warehouses[0];
            }
          }

          return set(() => ({
            user,
            jwt: token,
            roles,
            vendors,
            activeVendor,
            activeWarehouse,
            defaultVendorId,
            defaultWarehouseId,
          }));
        },
        setVendor: (vendor) => {
          set((state) => ({ 
            ...state, 
            activeVendor: vendor,
            // Reset warehouse to first warehouse of new vendor
            activeWarehouse: vendor.warehouses?.[0] 
          }));
        },
        setWarehouse: (warehouse) => set((state) => ({ ...state, activeWarehouse: warehouse })),
        reset: () => set(initialState),
      }),
      {
        name: "useInformation-storage",
      }
    )
  )
);

export { useUser };
