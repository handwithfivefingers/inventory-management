import React from "react";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";
enum IVariants {
  primary = "primary",
  secondary = "secondary",
}
export interface ITMButton extends BaseProps, React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode | string;
  variant?: typeof IVariants;
  component?: JSX.IntrinsicElements;
}

export type IButtonVariants = Record<IVariants, string>;

const variants: IButtonVariants = {
  primary: "bg-main-700 outline outline-transparent  focus:outline-main-300 active:outline-main-300 text-white",
  secondary: "bg-slate-300 outline outline-transparent  active:outline-indigo-200 text-white",
};
export const TMButton = ({ children, className, variant = "primary", component, htmlType, ...rest }: any) => {
  const Element = component || "button";
  return (
    <Element className={cn("px-6 py-1.5 rounded active:translate-y-[1px]", variants[variant as IVariants], className)} type={htmlType || 'button'} {...rest}>
      {children}
    </Element>
  );
};
