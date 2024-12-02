import type { ActionFunctionArgs, LinksFunction } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import "feather-icons/dist/feather";
import { AuthService } from "~/action.server/auth.service";
import "~/assets/styles/index.scss";
import { warehouseService } from "./action.server/warehouse.service";
import { AppLayout } from "./components/layouts";
import { AppProvider } from "./context";
import { http } from "./http";
import { getSession } from "./sessions";
export const loader = async ({ request }: ActionFunctionArgs) => {
  try {
    const session = await getSession(request.headers.get("Cookie"));
    const token = session.get("token");
    if (!token) {
      return {
        isLogin: false,
      };
    }
    http.setHeader("cookie", `session=${session.get("token")}`);
    const resp = await AuthService.getMe();
    if (!resp.data) {
      return {
        isLogin: false,
      };
    }

    const vendors = resp.data.vendors;
    let warehouse;
    if (vendors.length) {
      warehouse = await warehouseService.getWareHouses(vendors[0]?.id);
    }
    return {
      isLogin: true,
      data: resp.data,
      warehouses: warehouse.data,
    };
  } catch (error) {
    console.log("error", error);
    return {
      isLogin: false,
    };
  }
};

export function Layout({ children }: { children: React.ReactNode }) {
  const resp = useLoaderData<typeof loader>();
  const isLogin = resp?.isLogin || false;
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider
          vendors={isLogin ? resp.data.vendors : undefined}
          warehouses={isLogin ? resp.warehouses : undefined}
          isLogin={isLogin}
        >
          <AppLayout>{children}</AppLayout>
        </AppProvider>
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
