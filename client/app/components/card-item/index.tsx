import React from "react";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";

interface ICardItem extends BaseProps {
  title: string | React.ReactNode;
}
export const CardItem = ({ className, title, children }: ICardItem) => {
  return (
    <div className={cn("flex flex-col w-full rounded-md dark:bg-slate-600 bg-white shadow-sm", className || "")}>
      <div className="px-4 py-3 border-b border-indigo-600 dark:border-slate-500 font-semibold">{title}</div>
      <div className={cn("p-4")}>{children}</div>
    </div>
  );
};
