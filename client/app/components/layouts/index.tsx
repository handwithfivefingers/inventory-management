import React from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { BaseProps } from "~/types/common";

export const AppLayout = ({ children }: BaseProps) => {
  return (
    <div className="w-full bg-slate-300 min-h-[100svh] flex flex-col">
      <div className="w-full">
        <Header />
      </div>
      <div className="flex flex-row flex-1">
        <div className="w-full max-w-60 bg-indigo-200 border-dashed border-2 h-full shrink-0 px-4 py-4">
          <Sidebar />
        </div>
        <div className="container-lg mx-auto  h-full w-full rounded-sm px-4">{children}</div>
      </div>
    </div>
  );
};
