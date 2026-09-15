// import { LoaderFunctionArgs, Session } from "@remix-run/node";
import { Navigate, useFetcher } from "@remix-run/react";
import { useEffect } from "react";
// import { AuthService } from "~/action.server/auth.service";
// import { destroySession, parseCookieFromRequest } from "~/sessions";
// import { IVendor } from "~/types/vendor";
// import { IWareHouse } from "~/types/warehouse";

// const getActiveVendor = (session: Session, vendors: IVendor[]) => {
//   const vendorId = session.get("vendorId");
//   if (vendorId && vendors.findIndex((vendor) => vendor.id === Number(vendorId)) !== -1) {
//     return;
//   }
//   session.set("vendorId", vendors[0]?.id);
// };

// const getActiveWarehouse = (session: Session, warehouses: IWareHouse[]) => {
//   const warehouseId = session.get("warehouseId");
//   if (warehouseId && warehouses.findIndex((warehouse) => warehouse.id === Number(warehouseId)) !== -1) {
//     return;
//   }
//   session.set("warehouseId", warehouses[0]?.id);
// };

// export const loader = async ({ request }: LoaderFunctionArgs) => {
//   const { cookie, session, vendorId, warehouseId } = await parseCookieFromRequest(request);
//   try {
//     const userId = session.get("userId");
//     if (!userId) throw new Error("User not authenticated");
//     const getMeResponse = await AuthService.getMe({ cookie });
//     if (getMeResponse.status !== 200) throw getMeResponse;

//     return Response.json(
//       {
//         user,
//         role,
//         selectedVendorId: resolvedVendorId,
//         selectedWarehouseId: resolvedWarehouseId != null ? Number(resolvedWarehouseId) : undefined,
//         settings,
//       },
//       {
//         headers: {
//           "Set-Cookie": await commitSession(session),
//         },
//       },
//     );
//   } catch (error) {
//     return Response.json(
//       { error },
//       {
//         headers: {
//           "Set-Cookie": await destroySession(session),
//         },
//       },
//     );
//   }
// };

export default function Index() {
  const fetcher = useFetcher();
  useEffect(() => {
    fetcher.load("/");
  }, []);
  return <Navigate to="/dashboard" />;
}
