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
import { Icon } from "~/components/icon";
import { MODULE_ENUM } from "~/constants/modules";

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
  console.log(`{ data, total, page, pageSize }`, { data, total, page, pageSize });
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem
        title={
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                <Icon name="home" fontSize={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                  {t("warehouses.title")}
                </h2>
                <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                  {t("warehouses.titleHint")}
                </p>
              </div>
            </div>
          </div>
        }
        className="flex flex-col w-full rounded-md dark:bg-slate-500 bg-white shadow-2xl shadow-slate-200 gap-2 dark:shadow-slate-600 p-5 sm:p-6 h-full"
      >
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2 p-1">
            <TextInput placeholder={t("warehouses.searchPlaceholder")} />
            <div className="ml-auto block my-auto">
              <div className="flex gap-2 flex-wrap flex-row">
                <PermissionGuard permission="READ" module={MODULE_ENUM.warehouse} requireAdmin>
                  <TMButton component={Link} to={"./add"} size="sm">
                    <Icon name="plus" fontSize={16} />
                    <span>{t("common.add")}</span>
                  </TMButton>
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
