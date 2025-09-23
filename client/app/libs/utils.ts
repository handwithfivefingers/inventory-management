import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import DOMPurify from "dompurify";
import { LoaderFunctionArgs } from "@remix-run/node";

type IClassProps = undefined | string | Record<any, any>;

export const cn = (...args: IClassProps[]) => {
  return twMerge(clsx(args));
};

export const sanitize = (str: string) => {
  return DOMPurify.sanitize(str);
};

export const getLoaderRequestQuery = (request: LoaderFunctionArgs["request"]) => {
  const domain = new URL(request.url);
  // const searchParams = new URLSearchParams();
  // Object.entries(params).forEach(([key, value]) => {
  //   searchParams.set(key, value);
  // });
  const params = domain.searchParams;
  const searchParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    searchParams[key] = value;
  });
  // const page = params.get("page") || "1";
  // const pageSize = params.get("pageSize") || "10";
  searchParams.page = params.get("page") || "1";
  searchParams.pageSize = params.get("pageSize") || "10";
  return searchParams;
};
