import type { MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { LoaderFunctionArgs } from "react-router";
import { warehouseService } from "~/action.server/warehouse.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { PermissionGuard } from "~/components/permission-guard";
import { useTranslation } from "~/i18n";
import { dayjs } from "~/libs/date";
import { getLoaderRequestQuery } from "~/libs/utils";
import { parseCookieFromRequest } from "~/sessions";
import { IWareHouse } from "~/types/warehouse";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const { page, pageSize } = getLoaderRequestQuery(request);
  const resp = await warehouseService.getWareHouses({ cookie, vendorId, page, pageSize } as any);
  return {
    data: resp.data?.data,
    total: resp.data?.total,
    page: Number(page),
    pageSize: Number(pageSize),
  };
};

export const meta: MetaFunction = () => {
  return [{ title: "Kho bãi" }, { name: "description", content: "Quản lý kho bãi" }];
};

export default function WareHouses() {
  const { data, total, page, pageSize } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title={t("warehouses.title")} className="p-4 h-full">
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2">
            <TextInput placeholder={t("warehouses.searchPlaceholder")} />
            <div className="ml-auto block my-auto">
              <div className="flex gap-2 flex-wrap flex-row">
                <PermissionGuard requireAdmin>
                  <Link to={`./add`}>
                    <TMButton>{t("common.add")}</TMButton>
                  </Link>
                </PermissionGuard>
                <PermissionGuard requireAdmin>
                  <TMButton>{t("common.importExcel")}</TMButton>
                </PermissionGuard>
                <PermissionGuard permission="READ" module="warehouse">
                  <TMButton>{t("common.exportExcel")}</TMButton>
                </PermissionGuard>
                <PermissionGuard permission="READ" module="warehouse">
                  <TMButton>{t("common.printBarcode")}</TMButton>
                </PermissionGuard>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-col items-end flex-1">
            <TMTable
              columns={[
                {
                  title: t("warehouses.name"),
                  dataIndex: "name",
                },
                {
                  title: t("warehouses.quantity"),
                  dataIndex: "quantity",
                },
                {
                  title: t("warehouses.phone"),
                  dataIndex: "phone",
                },
                {
                  title: t("warehouses.address"),
                  dataIndex: "address",
                },
                {
                  title: t("common.createdAt"),
                  dataIndex: "createdAt",
                  render: (record) => dayjs(record.createdAt).format("DD/MM/YYYY"),
                },
              ]}
              data={data as IWareHouse[]}
              rowKey={"documentId"}
              onRow={{
                onClick: (record) => {
                  navigate(`./${record.id}`);
                },
              }}
            />
          </div>
          <div className="flex  gap-2 shrink-0">
            <TMPagination
              total={total || 0}
              current={page}
              pageSize={pageSize}
              onPageChange={(page: number) => {
                navigate(`?page=${page}&pageSize=${pageSize}`);
              }}
            />
          </div>
        </div>
      </CardItem>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}
