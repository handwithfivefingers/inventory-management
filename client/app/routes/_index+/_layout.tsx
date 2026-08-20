import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { useEffect } from "react";
import { AuthService } from "~/action.server/auth.service";
import { vendorService } from "~/action.server/vendor.service";
import { ErrorComponent } from "~/components/error-component";
import { AppLayout } from "~/components/layouts";
import { commitSession, destroySession, getSession, parseCookieFromRequest } from "~/sessions";
import { useUser } from "~/store/user.store";

export async function loader({ request }: LoaderFunctionArgs) {
  const { cookie, session } = await parseCookieFromRequest(request);
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
    const resp = await vendorService.getVendor({ cookie });
    console.log("getMeResponse", getMeResponse);
    const vendor = resp.data?.data;
    if (vendor?.length) {
      session.set("vendorId", vendor[0].id);
      if (vendor[0].warehouses?.length) {
        session.set("warehouseId", vendor[0].warehouses[0].id);
      }
    }
    return Response.json(
      { ...resp.data, user: getMeResponse.data?.data },
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
  const { data: vendor, user } = useLoaderData<typeof loader>();
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
      userStore.updateUser(user);
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
