import { useNavigation } from "@remix-run/react";
import { BaseProps } from "~/types/common";
import { Breadcrumb } from "../breadcrumb";
import { Loading } from "../loading";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

export const AppLayout = ({ children }: BaseProps) => {
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";
  return (
    <div className="w-full bg-slate-100/80 dark:bg-slate-600 min-h-[100svh] flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-auto">
        {/* <div className="w-full border-b border-primary shrink-0"> */}
        <Header />
        {/* </div> */}
        {/* <div className="container-lg mx-auto h-full w-full rounded-sm overflow-y-auto flex-1 flex flex-col"> */}

        <Breadcrumb />

        {isLoading && <Loading />}
        <div className="flex-1 min-h-0">{children}</div>
        {/* </div> */}
        {/* {children} */}
      </div>
    </div>
  );
};
