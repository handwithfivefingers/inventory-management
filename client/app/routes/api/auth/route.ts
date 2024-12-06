import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"; // or cloudflare/deno
import { json, redirect } from "@remix-run/node"; // or cloudflare/deno
import { namedAction } from "remix-utils/named-action";
import { AuthService } from "~/action.server/auth.service";
import { warehouseService } from "~/action.server/warehouse.service";
import { http } from "~/http";
import { commitSession, getSession } from "~/sessions";

export async function loader({ request }: LoaderFunctionArgs) {
  let session = await getSession(request.headers.get("cookie"));
  let token = session.get("token");
  if (!token) throw redirect("/login");
  http.setHeader("Cookie", `session=${token}`);
  const { data: me } = await AuthService.getMe();
  const { vendors, roles, ...rest } = me;
  session.set("user", rest);
  if (vendors?.length > 0) session.set("vendor", vendors[0].id);
  return json(me, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiaWF0IjoxNzMzMjA5Nzk0LCJleHAiOjE3MzMyOTYxOTR9.8suC2_E3Oqt0WHhITPhZeW8MMHgfUmrZnEiuHZR4iPY
// NEW
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiaWF0IjoxNzMzMjA5ODY4LCJleHAiOjE3MzMyOTYyNjh9.Vtqpb0okxZB2hyNvobU0iKhorxdqA5XFGRpuVV8jM7E
export async function action({ request }: ActionFunctionArgs) {
  return namedAction(request as any, {
    getWarehouse: async () => {
      const form = await request.formData();
      const vendorID = form.get("vendorID") as string;
      const { data } = await warehouseService.getWareHouses(vendorID);
      const session = await getSession(request.headers.get("Cookie"));
      console.log("data", data);
      if (data.length) {
        session.set("warehouse", data[0].id);
        console.log('session.get("warehouse")', data);
      }
      return json(data, {
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
