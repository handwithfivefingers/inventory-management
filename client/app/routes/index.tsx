import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { AuthService } from "~/action.server/auth.service";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const cookie = request.headers.get("cookie") as string;
    const user = await AuthService.getMe({ cookie });
    console.log("user", user);
    if (!user) throw redirect("/auth/login");
    return redirect("/dashboard");
  } catch (error) {
    console.log("function loader error", error);
    return redirect("/auth/login");
  }
};

export default function main() {
  return <div>Hello world</div>;
}
