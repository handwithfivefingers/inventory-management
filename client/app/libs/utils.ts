import clsx from "clsx";

type IClassProps = undefined | string | Record<any, any>;

export const cn = (...args: IClassProps[]) => {
  return clsx(args);
};
