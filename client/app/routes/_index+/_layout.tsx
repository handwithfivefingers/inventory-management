import { redirect, Session } from "@remix-run/node";
import { Outlet, useOutletContext } from "@remix-run/react";
import { useState } from "react";
import { LoaderArgs } from "~/action.server/context.server";
import { ErrorComponent } from "~/components/error-component";
import { AppLayout } from "~/components/layouts";
import { destroySession } from "~/sessions";
import { IVendorSettings } from "~/types/setting";
export async function loader({ request, context }: LoaderArgs) {
  const { userId, session } = context;
  if (!userId) {
    throw redirect("/auth/login", {
      headers: {
        "Set-Cookie": await destroySession(session as Session),
      },
    });
  }
  return {};
}
export interface MainLayoutContext {
  settings: IVendorSettings;
  setOpenSidebar: (open: boolean) => void;
}

const MainLayout = () => {
  const { settings } = useOutletContext<{ settings: any }>();
  const [openSidebar, setOpenSidebar] = useState(true);
  return (
    <AppLayout showSidebar={openSidebar}>
      <Outlet context={{ settings, setOpenSidebar }} />
    </AppLayout>
  );
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}

export default MainLayout;
