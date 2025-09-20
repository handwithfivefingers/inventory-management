import { useRouteError } from "@remix-run/react";

export function ErrorComponent() {
  const error: any = useRouteError();
  return (
    <div className="p-4 flex w-full gap-2 flex-col">
      <h1 className="text-red-500 text-3xl">Error</h1>
      <p className="text-xl text-red-500">{error?.message}</p>
      <p>{error?.stack}</p>
      <div className="bg-red-200 p-2 rounded-md">
        <pre className="whitespace-break-spaces text-gray-900/80">{JSON.stringify(error, null, 4)}</pre>
      </div>
    </div>
  );
}
