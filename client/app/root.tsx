import { LoaderFunctionArgs, Session } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import "animate.css";
import "feather-icons/dist/feather";
import { domAnimation, LazyMotion, useIsomorphicLayoutEffect } from "motion/react";
import { useEffect } from "react";
import "~/assets/styles/index.scss";
import "~/assets/styles/tailwind.css";
import { useLocale } from "~/store/locale.store";
import { applyTheme, initThemeSync, useTheme } from "~/store/theme.store";
import { AuthService } from "./action.server/auth.service";
import { settingService } from "./action.server/setting.service";
import { ErrorComponent } from "./components/error-component";
import { NotificationProvider } from "./components/notification";
import { applyNicheTheme } from "./libs/niche-theme";
import { commitSession, destroySession, parseCookieFromRequest } from "./sessions";
import { usePermissionStore } from "./store/permission.store";
import { useUser } from "./store/user.store";
import { DEFAULT_SETTINGS } from "./types/setting";
import { IVendor } from "./types/vendor";
import { IWareHouse } from "./types/warehouse";
// import { requestStorage } from "./libs/request-store";
/**
 * Applies the persisted theme before first paint to avoid a flash
 * of the wrong color scheme. Kept in sync with theme.store.ts.
 */
// const themeScript = `
// (function () {
//   try {
//     var raw = localStorage.getItem("theme-storage");
//     var theme = raw ? (JSON.parse(raw).state || {}).theme : "system";
//     var isDark =
//       theme === "dark" ||
//       (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
//     document.documentElement.classList.toggle("dark", isDark);
//     document.documentElement.style.colorScheme = isDark ? "dark" : "light";
//   } catch (e) {}
// })();
// `;

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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // return withContext(request, async ({ cookie, userId, vendorId, warehouseId, session }) => {
  const { cookie, session, vendorId, warehouseId } = await parseCookieFromRequest(request);
  try {
    // if (!userId || !cookie || !session) throw new Error("User not authenticated");
    const getMeResponse = await AuthService.getMe({ cookie });
    if (getMeResponse.status !== 200) throw getMeResponse;

    const user = getMeResponse.data?.data;
    if (!user) throw new Error("User not found");
    const vendors = user.vendors ?? [];

    getActiveVendor(session, vendors);
    getActiveWarehouse(session, vendors[0]?.warehouses ?? []);

    let settings = DEFAULT_SETTINGS;
    try {
      const settingsVendorId = session?.get("vendorId") ?? vendorId ?? vendors[0]?.id;
      if (settingsVendorId) {
        // The root loader is outside Remix route auto-context wrapping. Pass
        // the authenticated request context explicitly so /settings receives
        // both the session cookie and active vendor header.
        const res = await settingService.getSettings({
          cookie,
          vendorId: settingsVendorId,
          warehouseId: session?.get("warehouseId") ?? warehouseId,
        });
        const fetched = (res as any)?.data?.data ?? (res as any)?.data;
        if (fetched && typeof fetched === "object") {
          settings = { ...DEFAULT_SETTINGS, ...fetched };
        }
      }
    } catch (settingsError) {
      console.error("Failed to load settings, using defaults", settingsError);
    }
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
    // );
  } catch (error) {
    return Response.json(
      { error },
      {
        headers: {
          "Set-Cookie": await destroySession(session as Session),
        },
      },
    );
  }
  // });
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* <script dangerouslySetInnerHTML={{ __html: themeScript }} /> */}
      </head>
      <body className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden h-screen">
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

    // Niche-based UI customization (colors via CSS variables + terminology)
    applyNicheTheme((settings as any)?.appearance);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (useTheme.getState().theme === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", onSystemChange);
    // Live-sync the theme across tabs of the same session
    const cleanupThemeSync = initThemeSync();
    return () => {
      unsubscribe();
      cleanupThemeSync();
      media.removeEventListener("change", onSystemChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
