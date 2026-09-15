import { useNavigation } from "@remix-run/react";
import { BaseProps } from "~/types/common";
import { Breadcrumb } from "../breadcrumb";
import { Loading } from "../loading";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";

export const AppLayout = ({ children }: BaseProps) => {
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";
  return (
    <div className="w-full bg-slate-100/80 dark:bg-slate-900 h-[100dvh] min-h-[100svh] flex overflow-hidden">
      {/* Desktop sidebar; on mobile the BottomNav replaces it */}
      <div className="hidden sm:block h-full shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className="shrink-0">
          <Header />
        </div>

        <div className="shrink-0">
          <Breadcrumb />
        </div>

        {isLoading && <Loading />}
        {/* BottomNav is fixed h-14 + safe-area; reserve it only on mobile */}
        <div className="flex-1 min-h-0 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};
