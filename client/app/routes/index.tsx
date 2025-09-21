import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { AuthService } from "~/action.server/auth.service";
import { commitSession, getSession } from "~/sessions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const cookie = request.headers.get("cookie") as string;
    const resp = await AuthService.getMe({ cookie });
    const session = await getSession(cookie);
    if (!resp) throw redirect("/auth/login");
    session.set("userId", resp.data?.id);
    return redirect("/dashboard", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (error) {
    return redirect("/auth/login");
  }
};
