import { useNavigation } from "@remix-run/react";
import { BaseProps } from "~/types/common";
import { Breadcrumb } from "../breadcrumb";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { Loading } from "../loading";

export const AppLayout = ({ children }: BaseProps) => {
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";
  return (
    <div className="w-full bg-slate-100/80 dark:bg-slate-600 min-h-[100svh] flex flex-col h-screen">
      <div className="w-full border-b border-primary shrink-0">
        <Header />
      </div>
      <div className="flex flex-row flex-1 overflow-hidden">
        {isLoading && <Loading />}
        <div className="w-full max-w-60 h-full  shrink-0">
          <Sidebar />
        </div>
        <div className="container-lg mx-auto h-full w-full rounded-sm overflow-y-auto flex-1 flex flex-col">
          <Breadcrumb />
          <div className="flex-1 min-h-0">{children}</div>
        </div>
      </div>
    </div>
  );
};
