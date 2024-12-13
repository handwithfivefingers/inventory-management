import React from "react";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";
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
    "bg-main-700 dark:bg-main-300/20 outline outline-transparent  focus:outline-main-300 active:outline-main-300 text-indigo-950 dark:text-slate-200",
  secondary: "bg-slate-300 outline outline-transparent  active:outline-indigo-200 text-indigo-950 dark:text-slate-200",
  light:
    "bg-indigo-100 outline outline-transparent  active:outline-indigo-200 text-indigo-600 dark:text-slate-200 dark:bg-slate-700",
  ghost:
    "bg-transparent outline outline-transparent  active:outline-indigo-200 text-indigo-600 dark:text-slate-200 dark:dark:bg-transparent",
};

const sizes: IButtonSizes = {
  xs: "px-3 py-0.5 rounded-sm",
  sm: "px-4 py-1 rounded-md",
  md: "px-5 py-1.5 rounded-md",
  lg: "px-6 py-2 rounded-lg",
  xl: "px-7 py-3 rounded-xl",
};

export interface ITMButton extends BaseProps, React.ButtonHTMLAttributes<HTMLButtonElement>, BaseProps {
  variant?: "primary" | "light" | "ghost";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  component?: React.FC<any>;
  htmlType?: string;
  [key: string]: any;
}

export type IButtonVariants = Record<IVariants, string>;
export type IButtonSizes = Record<ISizes, string>;

export const TMButton = ({
  children,
  className,
  size = "md",
  variant = "primary",
  component,
  onClick,
  htmlType,
  ...rest
}: ITMButton) => {
  const Element: any = component || "button";
  const classCn = cn("active:translate-y-[1px]", sizes[size as ISizes], variants[variant as IVariants], className);
  return (
    <Element className={classCn} type={htmlType || "button"} onClick={onClick} {...rest}>
      {children}
    </Element>
  );
};
