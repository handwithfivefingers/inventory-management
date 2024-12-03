import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Outlet, useFetcher, useLoaderData } from "@remix-run/react";
import { memo, useEffect, useMemo } from "react";
import { AppLayout } from "~/components/layouts";
import { getSession } from "~/sessions";
import { useUser } from "~/store/user.store";
import { useVendor } from "~/store/vendor.store";
import { useWarehouse } from "~/store/warehouse.store";
import { IUser } from "~/types/user";
import { IVendor } from "~/types/vendor";
import { IWareHouse } from "~/types/warehouse";
export async function loader({ request }: LoaderFunctionArgs) {
  let session = await getSession(request.headers.get("cookie"));
  let token = session.get("token");
  let user = session.get("user");
  if (!token || !user?.id) throw redirect("/login");
  return user;
}

const LayoutSideEffect = memo(({ user }: { user: IUser }) => {
  const { data, submit } = useFetcher<{ vendors: IVendor[] }>({ key: "vendors" });
  const { data: dataWarehouse, submit: fetchWarehouse } = useFetcher<IWareHouse[]>({
    key: "warehouses",
  });
  const { updateVendor, activeVendor, defaultActive: vendor } = useVendor();
  const { updateWarehouse } = useWarehouse();
  const { updateUser } = useUser();

  useEffect(() => {
    submit(null, { method: "get", action: "/api/auth" });
    updateUser(user);
  }, []);
  useEffect(() => {
    if (data) {
      const vendors = data.vendors;
      const [firstVendor] = vendors;
      updateVendor(data.vendors);
      activeVendor(firstVendor);
    }
  }, [data]);
  useEffect(() => {
    if (vendor?.id) {
      fetchWarehouse({ vendorID: vendor.id }, { method: "POST", action: "/api/auth?/getWarehouse" });
    }
  }, [vendor?.id]);
  useEffect(() => {
    if (dataWarehouse?.length) {
      const [first] = dataWarehouse;
      updateWarehouse(first);
    }
  }, [dataWarehouse]);
  return null;
});

const MainLayout = () => {
  const user = useLoaderData<typeof loader>();

  const StoreMemoiz = useMemo(() => {
    if (user.id) return <LayoutSideEffect user={user} />;
    return null;
  }, [user.id]);

  return (
    <AppLayout>
      {StoreMemoiz}
      <Outlet />
    </AppLayout>
  );
};

export default MainLayout;
