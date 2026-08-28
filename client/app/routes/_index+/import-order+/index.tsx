import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { NumericFormat } from "react-number-format";
import { importOrderService } from "~/action.server/importOrder.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { PermissionGuard } from "~/components/permission-guard";
import { dayjs } from "~/libs/date";
import { getSession } from "~/sessions";
import { useTranslation } from "~/i18n";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { cookie, warehouseId, vendorId } = await import("~/sessions").then((m) => m.parseCookieFromRequest(request));
    const url = new URL(request.url);
    const params = url.searchParams;
    const page = params.get("page") || "1";
    const pageSize = params.get("pageSize") || "10";
    const resp = await importOrderService.getOrders({
      warehouseId: warehouseId as string,
      vendorId,
      page,
      pageSize,
      cookie,
    });

    return {
      data: resp.data?.data ?? [],
      total: resp.data?.total ?? 0,
      page: Number(page),
      pageSize: Number(pageSize),
    };
  } catch (error) {
    throw new Response("error", { status: 404 });
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Nhập hàng" }, { name: "description", content: "Nhập hàng" }];
};

export default function ImportOrder() {
  const { data, total, page, pageSize } = useLoaderData<typeof loader>();
  console.log("data", data);
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title={t("importOrder.title")} className="p-4 h-full">
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2">
            <TextInput placeholder={t("importOrder.searchPlaceholder")} />
            <div className="ml-auto block my-auto">
              <div className="flex gap-2 flex-wrap flex-row">
                <PermissionGuard requireAdmin>
                  <TMButton component={Link} to={"./add"}>
                    {t("importOrder.add")}
                  </TMButton>
                </PermissionGuard>
                <TMButton component={Link}>{t("common.exportExcel")}</TMButton>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-col items-end animate__animated animate__faster animate__fadeIn flex-1">
            <TMTable
              scrollable
              columns={[
                // {
                //   title: t("importOrder.stt"),
                //   dataIndex: "id",
                //   width: 80,
                //   render: (_record, i) => (page - 1) * pageSize + Number(i) + 1,
                // },
                {
                  title: t("importOrder.provider"),
                  dataIndex: "provider",
                  render: (record) => record.provider?.name || "-",
                },
                {
                  title: t("importOrder.quantity"),
                  dataIndex: "paid",
                  render: (record) => (
                    <NumericFormat
                      value={record.orderDetails?.reduce((o, c) => (o += c.quantity), 0)}
                      displayType={"text"}
                      thousandSeparator=","
                    />
                  ),
                },
                {
                  title: t("importOrder.total"),
                  dataIndex: "paid",
                  render: (record) => <NumericFormat value={record.paid} displayType={"text"} thousandSeparator="," />,
                },
                {
                  title: t("importOrder.staff"),
                  dataIndex: "staffName",
                  render: (record) => record?.["staffName"] || t("importOrder.defaultStaff"),
                },
                {
                  title: t("common.createdAt"),
                  dataIndex: "createdAt",
                  render: (record) => dayjs(record.createdAt).format("DD/MM/YYYY"),
                },
                {
                  title: t("common.actions"),
                  dataIndex: "id",
                  render: (record) => (
                    <TMButton component={Link} to={`./${record.id}`} variant="light" size="xs">
                      {t("importOrder.viewDetail")}
                    </TMButton>
                  ),
                },
              ]}
              data={data}
              rowKey={"id"}
            />
            <div className="flex gap-2">
              <TMPagination
                total={total || 0}
                current={page as number}
                pageSize={pageSize as number}
                onPageChange={(page: number) => {
                  navigate(`?page=${page}&pageSize=${pageSize}`);
                }}
              />
            </div>
          </div>
        </div>
      </CardItem>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}
