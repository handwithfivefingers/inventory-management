import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Outlet, useLoaderData, useRevalidator } from "@remix-run/react";
import { useEffect } from "react";
import { AuthService } from "~/action.server/auth.service";
import { settingService, DEFAULT_SETTINGS } from "~/action.server/setting.service";
import { ErrorComponent } from "~/components/error-component";
import { AppLayout } from "~/components/layouts";
import { commitSession, destroySession, parseCookieFromRequest } from "~/sessions";
import { useUser } from "~/store/user.store";

export async function loader({ request }: LoaderFunctionArgs) {
  const { cookie, session, vendorId, warehouseId } = await parseCookieFromRequest(request);
  try {
    const userId = session.get("userId");
    if (!userId) throw new Error("User not authenticated");

    const getMeResponse = await AuthService.getMe({ cookie });
    if (getMeResponse.status !== 200) throw getMeResponse;

    const user = getMeResponse.data?.data;
    const vendor = user?.vendors;
    if (vendor?.length) {
      if (!session.get("vendorId")) {
        session.set("vendorId", user?.defaultVendorId ?? vendor[0].id);
      }
      if (!session.get("warehouseId") && vendor[0].warehouses?.length) {
        // Prefer the vendor's main warehouse, falling back to the first one
        // (getMe already resolves this as `defaultWarehouseId`)
        const mainWarehouse =
          vendor[0].warehouses.find((w: { isMain?: boolean }) => w.isMain) ?? vendor[0].warehouses[0];
        session.set("warehouseId", user?.defaultWarehouseId ?? mainWarehouse.id);
      }
    }

    // Settings are non-critical: a failure here must never log the user out.
    // On a fresh login the vendorId was just hydrated into the session above;
    // fall back to defaults when there is still nothing to load with.
    let settings = DEFAULT_SETTINGS;
    try {
      const settingsVendorId = session.get("vendorId") ?? vendorId ?? vendor?.[0]?.id;
      if (settingsVendorId) {
        settings = await settingService.getSettings({ cookie, vendorId: settingsVendorId });
      }
    } catch (settingsError) {
      console.error("Failed to load settings, using defaults", settingsError);
    }

    return Response.json(
      {
        vendor,
        user: getMeResponse.data?.data,
        selectedVendorId: vendorId,
        selectedWarehouseId: Number(warehouseId),
        settings,
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
  const { user, selectedVendorId, selectedWarehouseId, settings } = useLoaderData<typeof loader>();
  const { syncAuth } = useUser();
  const revalidator = useRevalidator();

  useEffect(() => {
    if (!user) return;
    syncAuth({
      user,
      roles: user.roles,
      vendors: user.vendors,
      selectedVendorId,
      selectedWarehouseId,
    });
  }, [user, selectedVendorId, selectedWarehouseId]);
  useEffect(() => {
    revalidator.revalidate();
  }, [selectedVendorId, selectedWarehouseId]);

  return (
    <AppLayout>
      <Outlet context={{ settings }} />
    </AppLayout>
  );
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}

export default MainLayout;
