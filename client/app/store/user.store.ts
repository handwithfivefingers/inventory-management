import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { IUser } from "~/types/user";
// import type {} from "@redux-devtools/extension"; // required for devtools typing

interface IUserState {
  user: IUser | undefined;
  jwt: string | undefined;
  // increase: (by: number) => void;
  updateUser: (userInfo: IUser) => void;
  updateToken: (token: string) => void;
}

const useUser = create<IUserState>()(
  devtools(
    persist(
      (set) => ({
        user: undefined,
        jwt: undefined,
        updateUser: (userInfo) => set((state) => ({ ...state, user: userInfo })),
        updateToken: (token) => set((state) => ({ ...state, jwt: token })),
      }),
      {
        name: "useInformation-storage",
      }
    )
  )
);

export { useUser };
