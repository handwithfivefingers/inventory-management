import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";

import "~/assets/styles/index.scss";
import { AppLayout } from "./components/layouts";
import { useFetcher } from "@remix-run/react";
import { useEffect } from "react";
import { AuthService } from "~/action.server/auth.service";
import { useUser } from "~/store/user.store";
import { useVendor } from "~/store/vendor.store";
import { useWarehouse } from "~/store/warehouse.store";
import { IUser } from "~/types/user";
import "feather-icons/dist/feather";
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
export const action = async () => {
  return AuthService.getMe();
};
export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { vendors, updateVendor, activeVendor } = useVendor();
  const { updateWarehouse } = useWarehouse();
  const fetcher = useFetcher<IUser>({ key: "Home" });
  useEffect(() => {
    if (user?.id) {
      fetcher.submit(
        {},
        {
          method: "POST",
          action: ".",
        }
      );
    }
  }, [user]);

  useEffect(() => {
    if (fetcher?.data?.vendors?.length) {
      let [firstVendor] = fetcher.data.vendors;
      updateVendor(fetcher?.data?.vendors);
      activeVendor(firstVendor);
      if (firstVendor.warehouses?.length) {
        updateWarehouse(firstVendor.warehouses[0]);
      }
    }
  }, [vendors, fetcher.data]);
 
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
