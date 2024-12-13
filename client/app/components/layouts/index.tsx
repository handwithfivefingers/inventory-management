import { useNavigation } from "@remix-run/react";
import { BaseProps } from "~/types/common";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { Loading } from "../loading";

export const AppLayout = ({ children }: BaseProps) => {
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";
  return (
    <div className="w-full bg-slate-100/80 dark:bg-slate-600 min-h-[100svh] flex flex-col b-0">
      <div className="w-full border-b border-indigo-600">
        <Header />
      </div>
      <div className="flex flex-row flex-1">
        {isLoading && <Loading />}
        <div className="w-full max-w-60 h-[calc(100svh-59px)]  shrink-0">
          <Sidebar />
        </div>
        <div className="container-lg mx-auto  h-full w-full rounded-sm ">{children}</div>
      </div>
    </div>
  );
};
