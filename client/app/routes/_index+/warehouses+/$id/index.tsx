import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { warehouseService } from "~/action.server/warehouse.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { useTranslation } from "~/i18n";
import { dayjs } from "~/libs/date";
import { parseCookieFromRequest } from "~/sessions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { id } = params;
  if (!id) return redirect("/warehouses");
  const { vendorId, cookie } = await parseCookieFromRequest(request);
  const resp = await warehouseService.getWareHouseById({ id, vendorId, cookie });
  if (resp.status !== 200) throw new Response("Warehouse not found", { status: resp.status });
  return resp;
};

export const meta: MetaFunction = () => {
  return [{ title: "Thông tin kho hàng" }, { name: "description", content: "Thông tin kho hàng" }];
};

export default function WarehouseItem() {
  const { data } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  if (!data) return <div className="p-4">{t("warehouses.notFound")}</div>;
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title={t("warehouses.detailTitle")} className="p-4 h-full">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-gray-500">{t("warehouses.nameLabel")}: </span>
            {data.name}
          </div>
          <div>
            <span className="text-gray-500">{t("common.createdAt")}: </span>
            {data.createdAt ? dayjs(data.createdAt).format("DD/MM/YYYY") : "-"}
          </div>
          <div>
            <span className="text-gray-500">{t("warehouses.phone")}: </span>
            {data.phone || "-"}
          </div>
          <div>
            <span className="text-gray-500">{t("warehouses.email")}: </span>
            {data.email || "-"}
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">{t("warehouses.address")}: </span>
            {data.address || "-"}
          </div>
        </div>
      </CardItem>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}
