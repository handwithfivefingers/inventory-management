import React from "react";
import { cn } from "~/libs/utils";
const BADGE_CLASSNAMES = {
  success: "",
  warn: "bg-amber-100 text-amber-800",
  danger: "",
};
type Props = {
  children?: React.ReactNode;
  variant?: keyof typeof BADGE_CLASSNAMES;
};

export const Badge = (props: Props) => {
  return (
    <span className={cn("ml-2 rounded-full  px-2 py-0.5 text-xs", BADGE_CLASSNAMES[props?.variant || "success"])}>
      {props?.children}
    </span>
  );
};
