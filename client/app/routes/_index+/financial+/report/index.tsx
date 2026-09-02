import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { NumericFormat } from "react-number-format";
import { financialService } from "~/action.server/financial.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { DatePicker } from "~/components/form/date-picker";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { parseCookieFromRequest } from "~/sessions";
import { useTranslation } from "~/i18n";
import { dayjs } from "~/libs/date";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { cookie, warehouseId, vendorId } = await parseCookieFromRequest(request);
    const url = new URL(request.url);
    const now = dayjs();
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    // Bug 5 fix: default to current month (consistent with financial index page)
    // Bug 7 fix: validate from <= to
    let from = fromParam || "";
    let to = toParam || "";
    if (!fromParam || !dayjs(fromParam).isValid()) {
      from = now.startOf("month").format("YYYY-MM-DD");
    }
    if (!toParam || !dayjs(toParam).isValid()) {
      to = now.endOf("month").format("YYYY-MM-DD");
    }
    if (dayjs(from).isValid() && dayjs(to).isValid() && dayjs(from).isAfter(dayjs(to))) {
      throw new Response("Invalid date range: from must be <= to", { status: 400 });
    }

    const resp = await financialService.getReport({
      warehouseId: warehouseId as string,
      vendorId,
      from,
      to,
      cookie,
    });
    return {
      report: resp.data?.data ?? {
        revenue: 0,
        importCost: 0,
        otherExpense: 0,
        totalExpense: 0,
        netProfit: 0,
        vatCollected: 0,
        netRevenue: 0,
      },
      from,
      to,
    };
  } catch (error: any) {
    // Bug 6 fix: preserve real status/message instead of masking as 404
    if (error instanceof Response) throw error;
    const status = error?.status ?? error?.response?.status ?? 500;
    const message = error?.message ?? "Failed to load financial report";
    throw new Response(message, { status });
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Báo cáo thuế" }, { name: "description", content: "Báo cáo tài chính thuế" }];
};

export default function FinancialReport() {
  const { report, from, to } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const rows = [
    { key: "revenue", label: t("financial.revenue"), value: report.revenue, color: "text-green-500" },
    { key: "vatCollected", label: t("financial.vatCollected"), value: report.vatCollected, color: "text-blue-500" },
    { key: "netRevenue", label: t("financial.netRevenue") ?? "Net Revenue (excl. VAT)", value: (report as any).netRevenue ?? report.revenue - report.vatCollected, color: "text-emerald-600" },
    { key: "importCost", label: t("financial.importCost"), value: report.importCost, color: "text-red-500" },
    { key: "otherExpense", label: t("financial.otherExpense"), value: report.otherExpense, color: "text-red-500" },
    { key: "totalExpense", label: t("financial.totalExpense"), value: report.totalExpense, color: "text-red-500" },
    { key: "netProfit", label: t("financial.netProfit"), value: report.netProfit, color: "text-primary font-bold" },
  ];

  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title={t("financial.report")} className="p-4">
        <form
          className="flex gap-2 items-end flex-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const f = data.get("from") as string;
            const tt = data.get("to") as string;
            navigate(`?from=${f}&to=${tt}`);
          }}
        >
          <DatePicker label={t("financial.from")} name="from" defaultValue={from} clearable />
          <DatePicker label={t("financial.to")} name="to" defaultValue={to} clearable />
          <TMButton htmlType="submit" variant="light">
            {t("common.search")}
          </TMButton>
        </form>

        <div className="mt-4">
          <TMTable
            columns={[
              { title: t("common.actions"), dataIndex: "label" },
              {
                title: t("financial.amount"),
                dataIndex: "value",
                render: (record: any) => (
                  <span className={record.color}>
                    <NumericFormat value={record.value} displayType={"text"} thousandSeparator="," />
                  </span>
                ),
              },
            ]}
            data={rows}
            rowKey="key"
          />
        </div>
      </CardItem>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}
