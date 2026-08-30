import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Outlet, useOutletContext } from "@remix-run/react";
import { ErrorComponent } from "~/components/error-component";
import { AppLayout } from "~/components/layouts";
import { destroySession, parseCookieFromRequest } from "~/sessions";
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { userId, session } = await parseCookieFromRequest(request);
  if (!userId) {
    throw redirect("/auth/login", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }
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
