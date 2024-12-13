import { useRouteError } from "@remix-run/react";

export function ErrorComponent() {
  const error: any = useRouteError();
  return (
    <div>
      <h1>Error</h1>
      <p>{error?.message}</p>
      <p>{error?.stack}</p>
    </div>
  );
}
