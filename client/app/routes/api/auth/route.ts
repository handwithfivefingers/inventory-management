import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"; // or cloudflare/deno
import { json, redirect } from "@remix-run/node"; // or cloudflare/deno
import { namedAction } from "remix-utils/named-action";
import { AuthService } from "~/action.server/auth.service";
import { warehouseService } from "~/action.server/warehouse.service";
import { http } from "~/http";
import { commitSession, getSession, destroySession } from "~/sessions";

export async function loader({ request }: LoaderFunctionArgs) {
  let session = await getSession(request.headers.get("cookie"));
  try {
    let token = session.get("token");
    if (!token) throw redirect("/login");
    http.setHeader("Cookie", `session=${token}`);
    const resp = await AuthService.getMe();
    const { data: me } = resp;
    if (!me?.id) throw new Error("User not found");
    const { vendors, roles, ...rest } = me;
    session.set("user", rest);
    if (vendors?.length > 0) session.set("vendor", vendors[0].id);
    return json(me, {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (error) {
    return redirect("/login", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  return namedAction(request as any, {
    getWarehouse: async () => {
      try {
        const form = await request.formData();
        const vendorID = form.get("vendorID") as string;
        const { data } = await warehouseService.getWareHouses(vendorID);
        const session = await getSession(request.headers.get("Cookie"));
        if (data?.length) {
          session.set("warehouse", data[0].id);
        }
        return json(data, {
          headers: {
            "Set-Cookie": await commitSession(session),
          },
        });
      } catch (error) {
        return json({ data: {} });
      }
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
