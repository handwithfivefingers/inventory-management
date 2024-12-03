import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { IUser } from "~/types/user";
interface IUserState {
  user: IUser | undefined;
  jwt: string | undefined;
}
type Actions = {
  updateUser: (userInfo: IUser) => void;
  updateToken: (token: string) => void;
  reset: () => void;
};
const initialState: IUserState = {
  user: undefined,
  jwt: undefined,
};
const useUser = create<IUserState & Actions>()(
  devtools(
    persist(
      (set) => ({
        user: undefined,
        jwt: undefined,
        updateUser: (userInfo) => set((state) => ({ ...state, user: userInfo })),
        updateToken: (token) => set((state) => ({ ...state, jwt: token })),
        reset: () => set(initialState),
      }),
      {
        name: "useInformation-storage",
      }
    )
  )
);

export { useUser };
