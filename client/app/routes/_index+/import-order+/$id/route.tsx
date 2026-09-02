import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { NumericFormat } from "react-number-format";
import { importOrderService } from "~/action.server/importOrder.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { dayjs } from "~/libs/date";
import { getSession } from "~/sessions";
import { useTranslation } from "~/i18n";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const { id } = params;
    const { cookie, vendorId } = await import("~/sessions").then((m) => m.parseCookieFromRequest(request));
    const resp = await importOrderService.getOrderById(id as string, { cookie, vendorId });
    return {
      data: resp.data?.data ?? null,
    };
  } catch (error) {
    throw new Response("error", { status: 404 });
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Chi tiết nhập hàng" }, { name: "description", content: "Chi tiết phiếu nhập" }];
};

export default function ImportOrderDetail() {
  const { data } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  console.log("resp", data?.orderDetails);
  if (!data) return <div className="p-4">{t("common.noData")}</div>;
  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-5xl w-full mx-auto">
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="package" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                    {t("importOrder.title")} #{data.id}
                  </h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">Chi tiết phiếu nhập</p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <div className="grid grid-cols-2 gap-4 mb-4 mt-2">
            <div>
              <span className="text-gray-500">{t("importOrder.provider")}: </span>
              {data.provider?.name || "-"}
            </div>
            <div>
              <span className="text-gray-500">{t("common.createdAt")}: </span>
              {dayjs(data.createdAt).format("DD/MM/YYYY HH:mm")}
            </div>
            <div>
              <span className="text-gray-500">{t("importOrder.total")}: </span>
              <NumericFormat value={data.paid} displayType={"text"} thousandSeparator="," />
            </div>
            <div>
              <span className="text-gray-500">{t("importOrder.VAT")}: </span>
              {data.VAT}%
            </div>
          </div>
          <TMTable
            columns={[
              { title: t("importOrder.stt"), dataIndex: "id", width: 80, render: (_r: any, i) => Number(i) + 1 },
              { title: t("importOrder.product"), dataIndex: "name", render: (r: any) => r.product.name },
              {
                title: t("importOrder.total"),
                dataIndex: "buyPrice",
                render: (record: any) => (
                  <NumericFormat value={record.buyPrice} displayType={"text"} thousandSeparator="," />
                ),
              },
              { title: t("importOrder.quantity"), dataIndex: "quantity" },
            ]}
            data={data.orderDetails ?? []}
            rowKey="id"
          />
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-5">
            <TMButton variant="ghost" size="sm" component={Link} to="/import-order" type="button">
              {t("common.cancel")}
            </TMButton>
            <TMButton size="sm" component={Link} to="/import-order">
              <Icon name="save" fontSize={16} />
              {t("common.save")}
            </TMButton>
          </div>
        </CardItem>
      </div>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}
