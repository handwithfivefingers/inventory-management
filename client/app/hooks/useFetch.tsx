import { useFetcher } from "@remix-run/react";
import { useEffect } from "react";
import { IProduct } from "~/types/product";

interface IUseFetch {
  key?: string;
  action: string;
  method: "GET" | "POST";
  dependencies: any[];
  value: any | {};
  condition?: () => boolean;
}

type loading = "idle" | "loading" | "submitting" | undefined;
const useFetch = <T,>({ key, action, method, dependencies, value, condition }: IUseFetch) => {
  const fetcher = useFetcher<{ data: T }>({ key });
  useEffect(() => {
    const canFetch = condition ? condition() : false;
    if (canFetch && fetcher.state === "idle") {
      console.log("dependencies", dependencies);
      fetcher.submit(value, {
        method: method,
        action: action,
      });
    }
  }, [...dependencies]);

  return { data: fetcher.data };
};

export default useFetch;
