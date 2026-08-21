import type { ActionFunctionArgs } from "@remix-run/node";
import { commitSession, getSession } from "~/sessions";

/**
 * Persists the active vendor/warehouse selection into the session cookie.
 * Loaders read `vendorId`/`warehouseId` from this session, so updating it here
 * makes every data fetch respect the current selection after a revalidation.
 */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();

  const vendorId = formData.get("vendorId");
  const warehouseId = formData.get("warehouseId");

  if (typeof vendorId === "string" && vendorId !== "") {
    session.set("vendorId", vendorId);
  }
  if (typeof warehouseId === "string" && warehouseId !== "") {
    session.set("warehouseId", warehouseId);
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    },
  );
}
