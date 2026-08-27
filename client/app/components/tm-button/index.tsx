import React from "react";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";
import { Icon } from "../icon";
enum IVariants {
  primary = "primary",
  secondary = "secondary",
  light = "light",
  ghost = "ghost",
}
enum ISizes {
  xs = "xs",
  sm = "sm",
  md = "md",
  lg = "lg",
  xl = "xl",
}

const variants: IButtonVariants = {
  primary:
    "bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-400 dark:text-white dark:hover:bg-slate-100 dark:hover:text-indigo-600 text-indigo-600 hover:bg-indigo-100 transition-colors transition-all",
  secondary:
    "bg-slate-300 outline outline-transparent active:outline-indigo-200 text-indigo-950 dark:text-slate-200 transition-all",
  light:
    "bg-indigo-100 hover:bg-indigo-200 outline outline-transparent active:outline-indigo-200 text-indigo-600 dark:text-slate-200 dark:bg-slate-700 transition-all",
  ghost:
    "bg-transparent outline outline-transparent  active:outline-indigo-200 text-indigo-600 dark:text-slate-200 dark:dark:bg-transparent transition-all",
  outline:
    "bg-transparent border border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 transition-all",
};

const sizes: IButtonSizes = {
  xs: "px-1.5 py-0.5 rounded-sm text-xs",
  sm: "px-2 py-1 rounded-md text-sm",
  md: "px-4 py-1.5 rounded-md text-base",
  lg: "px-6 py-2 rounded-lg text-base",
  xl: "px-7 py-3 rounded-xl text-base",
};

export interface ITMButton extends BaseProps, React.ButtonHTMLAttributes<HTMLButtonElement>, BaseProps {
  variant?: "primary" | "light" | "ghost" | "outline";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  component?: React.FC<any>;
  htmlType?: string;
  loading?: boolean;
  [key: string]: any;
}

export type IButtonVariants = Record<IVariants | "outline", string>;
export type IButtonSizes = Record<ISizes, string>;

export const TMButton = ({
  children,
  className,
  size = "md",
  variant = "primary",
  component,
  onClick,
  htmlType,
  loading,
  ...rest
}: ITMButton) => {
  const Element: any = component || "button";
  const classCn = cn(
    "cursor-pointer active:translate-y-[1px] flex items-center justify-center gap-1",
    sizes[size as ISizes],
    variants[variant as IVariants],
    className,
  );
  return (
    <Element
      className={classCn}
      type={htmlType || "button"}
      onClick={onClick}
      {...rest}
      disabled={loading || rest.disabled}
    >
      {children}
      {loading && <Icon name="loader" className="animate-spin" />}
    </Element>
  );
};
