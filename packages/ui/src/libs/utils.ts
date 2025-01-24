import clsx from "clsx";
import { twMerge } from "tailwind-merge";

type IClassProps = undefined | string | Record<any, any>;

export const cn = (...args: IClassProps[]) => {
  return twMerge(clsx(args));
};
