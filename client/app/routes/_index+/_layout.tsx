import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { useEffect } from "react";
import { vendorService } from "~/action.server/vendor.service";
import { ErrorComponent } from "~/components/error-component";
import { AppLayout } from "~/components/layouts";
import { commitSession, destroySession, getSession, parseCookieFromRequest } from "~/sessions";
import { useUser } from "~/store/user.store";

export async function loader({ request }: LoaderFunctionArgs) {
  const { cookie, userId, session } = await parseCookieFromRequest(request);
  try {
    if (!userId) {
      return redirect("/auth/login", {
        headers: {
          "Set-Cookie": await destroySession(session),
        },
      });
    }
    const resp = await vendorService.getVendor({ cookie });
    const vendor = resp.data;

    if (vendor?.length) {
      session.set("vendorId", vendor[0].id);
      if (vendor[0].warehouses?.length) {
        session.set("warehouseId", vendor[0].warehouses[0].id);
      }
    }

    return {
      ...resp,
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    };
  } catch (error) {
    throw redirect("/auth/login", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }
}

const MainLayout = () => {
  const { data: vendor } = useLoaderData<typeof loader>();
  const userStore = useUser();
  
  useEffect(() => {
    if (vendor && !userStore.activeVendor) {
      // Initialize from legacy vendor store if user store is not initialized
      let activeVendor = vendor[0];
      let activeWarehouse = undefined;
      if (activeVendor && activeVendor.warehouses?.length) {
        activeWarehouse = activeVendor.warehouses[0];
      }
      userStore.setVendor(activeVendor);
      if (activeWarehouse) {
        userStore.setWarehouse(activeWarehouse);
      }
    }
  }, [vendor]);
  
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
