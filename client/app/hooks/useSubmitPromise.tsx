import { SubmitOptions, useFetcher } from "@remix-run/react";
import { useCallback, useEffect, useRef } from "react";
declare type SubmitTarget =
  | HTMLFormElement
  | HTMLButtonElement
  | HTMLInputElement
  | FormData
  | URLSearchParams
  | {
      [name: string]: string;
    }
  | null;
export function useSubmitPromise<T>() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolveRef = useRef<any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promiseRef = useRef<Promise<any>>();
  const fetcher = useFetcher<T>();
  const isLoading = fetcher.state !== "idle";
  if (!promiseRef.current) {
    promiseRef.current = new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }

  const resetResolver = useCallback(() => {
    promiseRef.current = new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, [promiseRef, resolveRef]);

  // const submit: <R,> = useCallback(
  //   (submitTarget : SubmitFunction['target'] , options: SubmitFunction['options']) => {
  //     fetcher.submit(submitTarget,options);
  //     return promiseRef.current as R;
  //   },
  //   [fetcher, promiseRef]
  // );
  const submit = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async <R,>(target: SubmitTarget, options: SubmitOptions = {}) => {
      fetcher.submit(target, options);
      return promiseRef.current as R;
    },
    [fetcher, promiseRef]
  );

  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      resolveRef.current?.(fetcher.data as T);
      resetResolver();
    }
  }, [fetcher, resetResolver]);

  return { ...fetcher, submit, isLoading, data: fetcher.data as T } as typeof fetcher & {
    submit: typeof submit;
    isLoading: boolean;
  };
}
