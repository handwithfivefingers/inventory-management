import { Navigate, useFetcher } from "@remix-run/react";
import { useEffect } from "react";

export default function Index() {
  const fetcher = useFetcher();
  useEffect(() => {
    fetcher.load("/");
  }, []);
  return <Navigate to="/dashboard" />;
}
