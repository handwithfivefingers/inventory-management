import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { NumericFormat } from "react-number-format";
import { importOrderService } from "~/action.server/importOrder.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TMTable } from "~/components/tm-table";
import { dayjs } from "~/libs/date";
import { getSession } from "~/sessions";
import { useTranslation } from "~/i18n";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const { id } = params;
    const resp = await importOrderService.getOrderById(id as string);
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
  if (!data) return <div className="p-4">{t("common.noData")}</div>;
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title={`${t("importOrder.title")} #${data.id}`} className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
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
            { title: t("importOrder.product"), dataIndex: "name" },
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
      </CardItem>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}
