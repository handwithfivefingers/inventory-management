import React from "react";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";

interface ICardItem extends BaseProps {
  title: string | React.ReactNode;
  action?: string | React.ReactNode;
  style?: React.CSSProperties;
}
export const CardItem = ({ className, title, children, action, style }: ICardItem) => {
  return (
    <div
      className={cn(
        "flex flex-col w-full rounded-md dark:bg-slate-500 bg-white shadow-2xl shadow-slate-200 gap-2 dark:shadow-slate-600",
        className || "",
      )}
      style={style}
    >
      <div className="w-full flex justify-between border-primary dark:border-slate-400 border-b pb-2  items-center ">
        <div className=" font-semibold text-xl flex ">{title}</div>
        <div>{action}</div>
      </div>
      {children}
    </div>
  );
};
