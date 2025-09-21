import { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { useEffect } from "react";
import { vendorService } from "~/action.server/vendor.service";
import { ErrorComponent } from "~/components/error-component";
import { AppLayout } from "~/components/layouts";
import { commitSession, getSession } from "~/sessions";
import { useVendor } from "~/store/vendor.store";
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const cookie = request.headers.get("cookie") as string;
    const resp = await vendorService.getVendor({ cookie });
    const session = await getSession(cookie);
    const vendor = resp.data;

    if (vendor?.length) {
      session.set("vendorId", vendor[0].id);
      if (vendor[0].warehouses?.length) {
        session.set("warehouseId", vendor[0].warehouses[0].id);
      }
    }

    return Response.json(
      { ...resp },
      {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      }
    );
  } catch (error) {
    throw new Error("Can't fetch vendor");
  }
}

const MainLayout = () => {
  const { data: vendor } = useLoaderData<typeof loader>();
  const vendorStore = useVendor();
  useEffect(() => {
    if (vendor) {
      vendorStore.initialize(vendor);
    }
  }, []);
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
