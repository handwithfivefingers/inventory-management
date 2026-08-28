import { Outlet, useOutletContext } from "@remix-run/react";
import { ErrorComponent } from "~/components/error-component";
import { AppLayout } from "~/components/layouts";
export const loader = () => {
  console.log("Coming Layout Loader");

  return {};
};
const MainLayout = () => {
  const settings = useOutletContext<{ settings: any }>();
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
