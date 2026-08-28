import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import "~/assets/styles/tailwind.css";
import "~/assets/styles/index.scss";
import "animate.css";
import "feather-icons/dist/feather";
import { useEffect } from "react";
import { ErrorComponent } from "./components/error-component";
import { NotificationProvider } from "./components/notification";
import { domAnimation, LazyMotion, useIsomorphicLayoutEffect } from "motion/react";
import { useLocale } from "~/store/locale.store";
import { applyTheme, useTheme } from "~/store/theme.store";
import { AuthService } from "./action.server/auth.service";
import { commitSession, destroySession, parseCookieFromRequest } from "./sessions";
import { LoaderFunctionArgs, redirect, Session } from "@remix-run/node";
import { IVendor } from "./types/vendor";
import { IWareHouse } from "./types/warehouse";
import { useUser } from "./store/user.store";
import { usePermissionStore } from "./store/permission.store";
import { DEFAULT_SETTINGS, settingService } from "./action.server/setting.service";

/**
 * Applies the persisted theme before first paint to avoid a flash
 * of the wrong color scheme. Kept in sync with theme.store.ts.
 */
const themeScript = `
(function () {
  try {
    var raw = localStorage.getItem("theme-storage");
    var theme = raw ? (JSON.parse(raw).state || {}).theme : "system";
    var isDark =
      theme === "dark" ||
      (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  } catch (e) {}
})();
`;

const getActiveVendor = (session: Session, vendors: IVendor[]) => {
  const vendorId = session.get("vendorId");
  if (vendorId && vendors.findIndex((vendor) => vendor.id === Number(vendorId)) !== -1) {
    return;
  }
  session.set("vendorId", vendors[0]?.id);
};

const getActiveWarehouse = (session: Session, warehouses: IWareHouse[]) => {
  const warehouseId = session.get("warehouseId");
  if (warehouseId && warehouses.findIndex((warehouse) => warehouse.id === Number(warehouseId)) !== -1) {
    return;
  }
  session.set("warehouseId", warehouses[0]?.id);
};

export async function loader({ request }: LoaderFunctionArgs) {
  console.log("Coming Root Loader");
  const { cookie, session, vendorId, warehouseId } = await parseCookieFromRequest(request);
  try {
    const userId = session.get("userId");
    if (!userId) throw new Error("User not authenticated");

    const getMeResponse = await AuthService.getMe({ cookie });
    if (getMeResponse.status !== 200) throw getMeResponse;

    const user = getMeResponse.data?.data;
    if (!user) throw new Error("User not found");

    console.log("user", user);
    const vendors = user.vendors ?? [];

    getActiveVendor(session, vendors);
    getActiveWarehouse(session, vendors[0]?.warehouses ?? []);

    // const activeVendor = vendors.find((vendor) => vendor.id === vendorId);
    // const activeWarehouse = activeVendor?.warehouses?.find((warehouse) => warehouse.id === warehouseId);

    // Seed the selection once on a fresh session. `getMe` already resolves the
    // default vendor/warehouse; fall back to the first vendor/warehouse only
    // when those are absent.
    // if (!session.get("vendorId")) {
    //   session.set("vendorId", vendors[0]?.id);
    // }
    // if (!session.get("warehouseId") && vendors[0]?.warehouses?.length) {
    //   session.set("warehouseId", vendors[0]?.warehouses?.[0]?.id);
    // }

    // Settings are non-critical: a failure here must never log the user out.
    // On a fresh login the vendorId was just hydrated into the session above;
    // fall back to defaults when there is still nothing to load with.
    let settings = DEFAULT_SETTINGS;
    try {
      const settingsVendorId = session.get("vendorId") ?? vendorId ?? vendors[0]?.id;
      if (settingsVendorId) {
        settings = await settingService.getSettings({ cookie, vendorId: settingsVendorId });
      }
    } catch (settingsError) {
      console.error("Failed to load settings, using defaults", settingsError);
    }

    // Return what is actually in the session after seeding above. The locally
    // destructured `vendorId`/`warehouseId` were read from the incoming cookie
    // *before* seeding, so on a fresh login they are still empty — returning
    // them would make the UI fall back to a different warehouse than the one
    // server-side loaders use.
    const resolvedVendorId = session.get("vendorId") ?? vendorId;
    const resolvedWarehouseId = session.get("warehouseId") ?? warehouseId;
    // `vendors` travel inside `user` (single source of truth) - no duplication.
    const role = user.role;
    delete user.role;
    return Response.json(
      {
        user,
        role,
        selectedVendorId: resolvedVendorId,
        selectedWarehouseId: resolvedWarehouseId != null ? Number(resolvedWarehouseId) : undefined,
        settings,
      },
      {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      },
    );
  } catch (error) {
    // throw redirect("/auth/login", {
    //   headers: {
    //     "Set-Cookie": await destroySession(session),
    //   },
    // });
    return Response.json(
      { error: error.message },
      {
        headers: {
          "Set-Cookie": await destroySession(session),
        },
      },
    );
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-white dark:bg-slate-700">
        {children}
        <ScrollRestoration />
        <Scripts />
        <NotificationProvider />
      </body>
    </html>
  );
}

export default function App() {
  // Rehydrate client preferences after mount so SSR markup matches,
  // then keep the <html> class in sync with the stored theme.
  const { user, selectedVendorId, selectedWarehouseId, settings, role } = useLoaderData<typeof loader>();
  const { syncAuth } = useUser();
  const updatePermissions = usePermissionStore().updatePermissions;
  useIsomorphicLayoutEffect(() => {
    if (!user) return;
    syncAuth({
      user,
      vendors: user.vendors,
      selectedVendorId,
      selectedWarehouseId,
    });
  }, []);

  useIsomorphicLayoutEffect(() => {
    updatePermissions(role);
  }, []);
  useEffect(() => {
    useTheme.persist.rehydrate();
    useLocale.persist.rehydrate();
    applyTheme(useTheme.getState().theme);
    const unsubscribe = useTheme.subscribe((state) => applyTheme(state.theme));

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (useTheme.getState().theme === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", onSystemChange);
    return () => {
      unsubscribe();
      media.removeEventListener("change", onSystemChange);
    };
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <Outlet context={{ settings }} />
    </LazyMotion>
  );
}

export const shouldRevalidate = () => false;

export function ErrorBoundary() {
  return <ErrorComponent />;
}
