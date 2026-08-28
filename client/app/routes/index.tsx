import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { commitSession, destroySession, parseCookieFromRequest } from "~/sessions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("Coming Root Loader");
  const { cookie, session, userId } = await parseCookieFromRequest(request);
  try {
    if (!userId) {
      throw redirect("/auth/login", {
        headers: {
          "Set-Cookie": await destroySession(session),
        },
      });
    }
    return redirect("/dashboard", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (error) {
    return redirect("/auth/login", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }
};
