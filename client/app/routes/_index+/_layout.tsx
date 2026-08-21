import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Outlet, useFetcher, useLoaderData, useRevalidator } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { AuthService } from "~/action.server/auth.service";
import { vendorService } from "~/action.server/vendor.service";
import { ErrorComponent } from "~/components/error-component";
import { AppLayout } from "~/components/layouts";
import { commitSession, destroySession, getSession, parseCookieFromRequest } from "~/sessions";
import { useUser } from "~/store/user.store";

export async function loader({ request }: LoaderFunctionArgs) {
  const { cookie, session, vendorId, warehouseId } = await parseCookieFromRequest(request);
  try {
    const userId = session.get("userId");
    if (!userId) {
      return redirect("/auth/login", {
        headers: {
          "Set-Cookie": await destroySession(session),
        },
      });
    }
    const getMeResponse = await AuthService.getMe({ cookie });
    // const resp = await vendorService.getVendor({ cookie });
    const user = getMeResponse.data?.data;
    const vendor = user?.vendors;
    if (vendor?.length) {
      if (!session.get("vendorId")) {
        session.set("vendorId", vendor[0].id);
      }
      if (!session.get("warehouseId") && vendor[0].warehouses?.length) {
        session.set("warehouseId", vendor[0].warehouses[0].id);
      }
    }
    return Response.json(
      {
        vendor,
        user: getMeResponse.data?.data,
        selectedVendorId: vendorId,
        selectedWarehouseId: warehouseId,
      },
      {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      },
    );
  } catch (error) {
    throw redirect("/auth/login", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }
}

const MainLayout = () => {
  const { user, selectedVendorId, selectedWarehouseId } = useLoaderData<typeof loader>();
  const { syncAuth } = useUser();
  const revalidator = useRevalidator();

  useEffect(() => {
    if (!user) return;
    // `useUser` is the single source of truth, hydrated from `getMe`.
    // `syncAuth` always refreshes user/roles/vendors (so permissions are
    // re-verified on every `getMe` change) and preserves the active
    // vendor/warehouse selection when it stays valid (falling back to the
    // persisted cookie selection on a fresh load).
    syncAuth({
      user,
      roles: user.roles,
      vendors: user.vendors,
      selectedVendorId,
      selectedWarehouseId,
    });
  }, [user, selectedVendorId, selectedWarehouseId]);

  // React to a *user-initiated* selection change in the global store. We only
  // persist the new selection to the session cookie here; the actual refetch of
  // the data routes happens in the effect below, once the cookie is committed.
  // useEffect(() => {
  //   if (prevSelection.current === null) {
  //     // First hydration from getMe — just record it, do not trigger anything.
  //     prevSelection.current = { vendor: activeVendorId, warehouse: activeWarehouseId };
  //     return;
  //   }
  //   if (
  //     prevSelection.current.vendor === activeVendorId &&
  //     prevSelection.current.warehouse === activeWarehouseId
  //   ) {
  //     return; // no real change
  //   }
  //   prevSelection.current = { vendor: activeVendorId, warehouse: activeWarehouseId };

  //   pendingRefetch.current = true;
  //   sessionFetcher.submit(
  //     {
  //       vendorId: activeVendorId != null ? String(activeVendorId) : "",
  //       warehouseId: activeWarehouseId != null ? String(activeWarehouseId) : "",
  //     },
  //     { method: "POST", action: "/api/session" },
  //   );
  // }, [activeVendorId, activeWarehouseId, sessionFetcher]);

  // // Once the session cookie reflects the new selection, re-run every route
  // // loader so all server-side fetches respect the chosen vendor/warehouse.
  // useEffect(() => {
  //   if (pendingRefetch.current && sessionFetcher.state === "idle") {
  //     pendingRefetch.current = false;
  //     revalidator.revalidate();
  //   }
  // }, [sessionFetcher.state, sessionFetcher.data, revalidator]);

  useEffect(() => {
    revalidator.revalidate();
  }, [selectedVendorId, selectedWarehouseId]);

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}

export default MainLayout;
