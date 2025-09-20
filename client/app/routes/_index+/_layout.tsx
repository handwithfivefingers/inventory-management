import { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { AuthService } from "~/action.server/auth.service";
// import { AuthService } from "~/action.client/auth.service";
import { AppLayout } from "~/components/layouts";
// export async function loader({ request }: LoaderFunctionArgs) {
//   try {
//     const cookie = request.headers.get("cookie") as string;
//     const resp = await AuthService.getMe({ cookie });
//     return resp.data;
//   } catch (error) {
//     return error;
//   }
// }

const MainLayout = () => {
  // const user = useLoaderData<typeof loader>();
  // console.log("user", user);
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
};

export default MainLayout;
