import React from "react";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";

interface ICardItem extends BaseProps {
  title: string | React.ReactNode;
}
export const CardItem = ({ className, title, children }: ICardItem) => {
  return (
    <div className={cn("flex flex-col w-full rounded-md dark:bg-slate-500 bg-white shadow-sm gap-2", className || "")}>
      <div className="border-b border-indigo-600 dark:border-slate-400 font-semibold text-xl pb-2">{title}</div>
      {/* <div className={cn("p-4")}>{children}</div> */}
      {children}
    </div>
  );
};
