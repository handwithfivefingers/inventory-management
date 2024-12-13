import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import DOMPurify from "dompurify";

type IClassProps = undefined | string | Record<any, any>;

export const cn = (...args: IClassProps[]) => {
  return twMerge(clsx(args));
};

export const sanitize = (str: string) => DOMPurify.sanitize(str);
