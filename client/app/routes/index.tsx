import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { AuthService } from "~/action.server/auth.service";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const cookie = request.headers.get("cookie") as string;
    // const session = await getSession(cookie);
    // console.log("session", session);
    // const token = session.get("token");
    // console.log("token", token);
    console.log("coming", cookie);
    const user = await AuthService.getMe({ cookie });
    console.log("user", user);
    if (!user) throw redirect("/auth/login");
    // return data(user, {
    //   headers: {
    //     "Set-Cookie": await commitSession(session),
    //   },
    // });
    return redirect("/dashboard");
  } catch (error) {
    console.log("function loader error", error);
    return {};
  }
};

export default function main() {
  return <div>Hello world</div>;
}
