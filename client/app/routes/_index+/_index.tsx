import { LoaderFunctionArgs } from "@remix-run/node";
import { Navigate, useFetcher } from "@remix-run/react";
import { useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {};

export default function Index() {
  const fetcher = useFetcher();
  useEffect(() => {
    fetcher.load("/");
  }, []);
  return <Navigate to="/dashboard" />;
}
