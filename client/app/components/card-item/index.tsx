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
        "flex flex-col w-full rounded-md bg-white shadow-2xl shadow-slate-200 gap-2 dark:bg-slate-800 dark:shadow-black/20",
        className || "",
      )}
      style={style}
    >
      <div className="w-full flex flex-wrap justify-between gap-2 border-primary dark:border-slate-700 border-b pb-2 items-center">
        <div className="font-semibold text-base sm:text-xl flex min-w-0 flex-1">{title}</div>
        {action ? <div className="shrink-0 max-w-full">{action}</div> : null}
      </div>
      {children}
    </div>
  );
};
