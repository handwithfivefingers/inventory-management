import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { IRole } from "~/types/user";

// type PermissionStore = {
//   id?: number;
//   name?: string;
//   isAdmin: boolean;
//   permissions: {
//     name: string;
//     method: "CREATE" | "READ" | "UPDATE" | "DELETE";
//   }[];
// };

type Actions = {
  updatePermissions: (permissions: IRole) => void;
};

export const usePermissionStore = create<IRole & Actions>()(
  devtools((set) => ({
    id: -1,
    name: "",
    isAdmin: false,
    permissions: [],
    updatePermissions: (permissions) => set(() => ({ ...permissions })),
  })),
);
