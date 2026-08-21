import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { NumericFormat } from "react-number-format";
import { financialService } from "~/action.server/financial.service";
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
    const cookie = request.headers.get("Cookie") as string;
    const session = await getSession(cookie);
    const warehouseId = session.get("warehouseId");
    const url = new URL(request.url);
    const params = url.searchParams;
    const page = params.get("page") || "1";
    const pageSize = params.get("pageSize") || "10";
    const type = params.get("type") || "";
    const resp = await financialService.getVouchers({
      warehouseId: warehouseId as string,
      page,
      pageSize,
      type,
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
  return [{ title: "Tài chính" }, { name: "description", content: "Quản lý tài chính" }];
};

export default function Financial() {
  const { data, total, page, pageSize } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title={t("financial.title")} className="p-4">
        <div className="py-2">
          <div className="flex gap-2">
            <TextInput label="Name" placeholder={t("providers.searchPlaceholder")} />
            <div className="ml-auto block my-auto">
              <div className="flex gap-2 flex-wrap flex-row">
                <PermissionGuard requireAdmin>
                  <TMButton component={Link} to={"./add"}>
                    {t("financial.addVoucher")}
                  </TMButton>
                </PermissionGuard>
                <PermissionGuard requireAdmin>
                  <TMButton component={Link} to={"./report"}>
                    {t("financial.report")}
                  </TMButton>
                </PermissionGuard>
                <PermissionGuard requireAdmin>
                  <TMButton component={Link}>{t("common.exportExcel")}</TMButton>
                </PermissionGuard>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-col items-end animate__animated animate__faster animate__fadeIn">
          <TMTable
            columns={[
              {
                title: t("financial.stt"),
                dataIndex: "id",
                width: 80,
                render: (record, i) => Number(i) + 1,
              },
              {
                title: t("financial.code"),
                dataIndex: "code",
              },
              {
                title: t("financial.type"),
                dataIndex: "type",
                render: (record) =>
                  record.type == "expense" ? (
                    <span className="text-red-500">{t("financial.expense")}</span>
                  ) : (
                    <span className="text-green-500">{t("financial.revenue")}</span>
                  ),
              },
              {
                title: t("financial.category"),
                dataIndex: "category",
              },
              {
                title: t("financial.amount"),
                dataIndex: "amount",
                render: (record) => (
                  <NumericFormat value={record.amount} displayType={"text"} thousandSeparator="," />
                ),
              },
              {
                title: t("financial.staff"),
                dataIndex: "staffName",
                render: (record) => record["staffName"] || t("financial.defaultStaff"),
              },
              {
                title: t("common.createdAt"),
                dataIndex: "transactionDate",
                render: (record) => dayjs(record.transactionDate).format("DD/MM/YYYY HH:mm"),
              },
              {
                title: t("common.actions"),
                dataIndex: "id",
                render: (record) => (
                  <TMButton component={Link} to={`./${record.id}`} variant="light" size="xs">
                    {t("common.view")}
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
      </CardItem>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}
