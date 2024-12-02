import type { ActionFunctionArgs, LinksFunction } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import "feather-icons/dist/feather";
import { useEffect } from "react";
import { redirect, useFetcher } from "react-router-dom";
import { AuthService } from "~/action.server/auth.service";
import "~/assets/styles/index.scss";
import { warehouseService } from "./action.server/warehouse.service";
import { AppLayout } from "./components/layouts";
import { http } from "./http";
import { getSession } from "./sessions";
import { useVendor } from "./store/vendor.store";
import { useWarehouse } from "./store/warehouse.store";
export const loader = async ({ request }: ActionFunctionArgs) => {
  const session = await getSession(request.headers.get("Cookie"));
  console.log("session token", session.get("token"));
  console.log("session warehouse id", session.get("warehouse"));
  console.log("session vendor id", session.get("vendor"));
  http.setHeader("cookie", `session=${session.get("token")}`);
  const resp = await AuthService.getMe();
  if (!resp) return redirect("/login");
  const vendors = resp.data.vendors;
  let warehouse;
  if (vendors.length) {
    warehouse = await warehouseService.getWareHouses(vendors[0]?.id);
  }
  return {
    data: resp.data,
    warehouses: warehouse.data,
  };
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { data, warehouses } = useLoaderData<typeof loader>();
  const { defaultActive, updateVendor, activeVendor } = useVendor();
  const { warehouse, updateWarehouse } = useWarehouse();
  const fetcher = useFetcher();
  useEffect(() => {
    if (data?.vendors) {
      updateVendor(data.vendors);
      activeVendor(data.vendors[0]);
      if (warehouses?.[0]) {
        updateWarehouse(warehouses[0]);
      }
    }
  }, []);

  useEffect(() => {
    if (warehouse?.id) {
      fetcher.submit({ warehouse: warehouse.id }, { method: "POST", action: "/api/storage?/storageWarehouse" });
    }
  }, [warehouse]);

  useEffect(() => {
    if (defaultActive?.id) {
      fetcher.submit({ vendor: defaultActive.id }, { method: "POST", action: "/api/storage?/storageVendor" });
    }
  }, [defaultActive]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppLayout>{children}</AppLayout>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
export const shouldRevalidate = () => false;
export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];
