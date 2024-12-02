import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"; // or cloudflare/deno
import { json, redirect } from "@remix-run/node"; // or cloudflare/deno
import { namedAction } from "remix-utils/named-action";
import { AuthService, ILoginParams } from "~/action.server/auth.service";
import { commitSession, getSession } from "~/sessions";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (session.has("token")) {
    return redirect("/");
  }
  const data = { error: session.get("error") };
  return json(data, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  return namedAction(request as any, {
    login: async () => {
      const session = await getSession(request.headers.get("Cookie"));
      const form = await request.formData();
      const email = form.get("email");
      const password = form.get("password");
      const params: ILoginParams = { email: `${email}`, password: `${password}` };
      console.log("params", params);
      const resp = await AuthService.login(params);
      if (!resp.data?.id) {
        session.flash("error", "Invalid username/password");
        return redirect("/login", {
          headers: {
            "Set-Cookie": await commitSession(session),
          },
        });
      }
      session.set("token", resp.token);

      console.log("SET TOKEN", resp.token);
      return redirect("/", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    },
    storageWarehouse: async () => {
      const session = await getSession(request.headers.get("Cookie"));
      const form = await request.formData();
      const warehouse = form.get("warehouse");
      session.set("warehouse", warehouse as string);
      return json(warehouse, {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    },
    storageVendor: async () => {
      const session = await getSession(request.headers.get("Cookie"));
      const form = await request.formData();
      const vendor = form.get("vendor");
      session.set("vendor", vendor as string);
      return json(vendor, {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    },
  });
}
