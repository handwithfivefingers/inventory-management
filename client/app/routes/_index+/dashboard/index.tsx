import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { BarChart, LineChart } from "chartist";
import "chartist/dist/index.css";
import { NumericFormat } from "react-number-format";
import { ReactNode, useEffect, useRef, useState } from "react";
import { statsService } from "~/action.server/stats.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { DateRangePicker } from "~/components/form/date-picker";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { useTranslation } from "~/i18n";
import { hoverTooltips } from "~/libs/chartist-tooltip";
import { dayjs } from "~/libs/date";
import { cn } from "~/libs/utils";
import { parseCookieFromRequest } from "~/sessions";
import "./styles.scss";
import { SelectInput } from "~/components/form/select-input";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cookie, warehouseId } = await parseCookieFromRequest(request);
  const url = new URL(request.url);
  const days = url.searchParams.get("days") || "7";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const groupBy = url.searchParams.get("groupBy") || "";
  try {
    const resp = await statsService.getDashboard({ cookie, warehouseId, days, from, to, groupBy });
    return {
      stats: resp.data?.data ?? null,
      days: Number(days),
      from,
      to,
      groupBy,
    };
  } catch (error) {
    return { stats: null, days: Number(days), from, to, groupBy };
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Doanh thu - EPOS" }];
};

export default function Home() {
  const { stats, days, from, to, groupBy } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const revenueRef = useRef<HTMLDivElement>(null);
  const ordersRef = useRef<HTMLDivElement>(null);

  const periods = [7, 30, 90];

  const isCustomRange = !!(from || to);
  const [preset, setPreset] = useState(isCustomRange ? "custom" : String(days));
  const [range, setRange] = useState({ from, to });
  const granularity = stats?.range?.granularity ?? "day";

  useEffect(() => {
    if (!stats?.series?.length) return;
    const labels = stats.series.map((point) => point.label);
    if (revenueRef.current) {
      new LineChart(revenueRef.current, { labels, series: [stats.series.map((point) => point.revenue)] }, {
        axisX: { position: "start" },
        axisY: { position: "end" },
        plugins: [hoverTooltips({ suffix: " đ" })],
      } as any);
    }
    if (ordersRef.current) {
      new BarChart(ordersRef.current, { labels, series: [stats.series.map((point) => point.orders)] }, {
        axisX: { position: "start" },
        axisY: { position: "end", onlyInteger: true },
        plugins: [hoverTooltips()],
      } as any);
    }
  }, [stats]);

  // Span of the current selection drives which groupings make sense,
  // so users can't pick a scale that renders the chart unreadable.
  const fromDate = dayjs(range.from);
  const toDate = dayjs(range.to);
  const spanDays =
    isCustomRange && fromDate.isValid() && toDate.isValid()
      ? Math.abs(toDate.startOf("day").diff(fromDate.startOf("day"), "day")) + 1
      : Number(days) || 7;
  const granularityOptions = [
    { value: "day" as const, enabled: spanDays <= 62 },
    { value: "week" as const, enabled: spanDays >= 10 },
    { value: "month" as const, enabled: spanDays >= 45 },
  ];

  console.log("groupBy", groupBy);
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-semibold">{t("dashboard.title")}</h1>
        <div className="ml-auto flex gap-2 items-center flex-wrap">
          <div className="flex gap-2 items-center pt-2">
            <div className="flex rounded-md overflow-hidden ring-1 ring-gray-300 mb-2">
              {granularityOptions.map(({ value: g, enabled }) => (
                <button
                  key={g}
                  type="button"
                  disabled={!enabled}
                  title={enabled ? undefined : t("dashboard.groupDisabledHint")}
                  className={cn(
                    "px-3 py-1.5 text-sm bg-transparent border-0 transition-colors",
                    granularity === g
                      ? "bg-indigo-600 text-white"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-indigo-50",
                    {
                      ["opacity-40 cursor-not-allowed pointer-events-none"]: !enabled,
                      ["cursor-pointer"]: enabled,
                    },
                  )}
                  onClick={() =>
                    navigate(from && to ? `?from=${from}&to=${to}&groupBy=${g}` : `?days=${days}&groupBy=${g}`)
                  }
                >
                  {t(`dashboard.group${g.charAt(0).toUpperCase()}${g.slice(1)}`)}
                </button>
              ))}
            </div>
            <div className="">
              <SelectInput
                options={[
                  ...periods.map((p) => ({ label: p, value: p })),
                  { label: t("dashboard.custom"), value: "custom" },
                ]}
                value={preset}
                onSelect={(value) => {
                  setPreset(value as string);
                  if (value !== "custom") navigate(`?days=${value}`);
                }}
              />
            </div>
          </div>

          {/* <select
            aria-label={t("dashboard.title")}
            className="rounded-md ring-1 ring-gray-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm py-1.5 px-2 outline-none cursor-pointer"
            value={preset}
            onChange={(e) => {
              const value = e.target.value;
              setPreset(value);
              if (value !== "custom") navigate(`?days=${value}`);
            }}
          >
            {periods.map((period) => (
              <option key={period} value={String(period)}>
                {t(`dashboard.last${period}Days`)}
              </option>
            ))}
            <option value="custom">{t("dashboard.custom")}</option>
          </select> */}
        </div>
      </div>

      {preset === "custom" && (
        <div className="flex gap-2 items-end flex-wrap -mt-2">
          <DateRangePicker from={range.from} to={range.to} onChange={setRange} clearable />
          <TMButton
            size="sm"
            variant="light"
            disabled={!range.from || !range.to}
            onClick={() => navigate(`?from=${range.from}&to=${range.to}`)}
          >
            {t("common.apply")}
          </TMButton>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t("dashboard.revenue")}
          variant="green"
          value={
            <NumericFormat value={stats?.totalRevenue ?? 0} displayType={"text"} thousandSeparator="," suffix=" đ" />
          }
        />
        <KpiCard label={t("dashboard.orders")} variant="blue" value={stats?.totalOrders ?? 0} />
        <KpiCard
          label={t("dashboard.avgOrderValue")}
          variant="indigo"
          value={
            <NumericFormat value={stats?.avgOrderValue ?? 0} displayType={"text"} thousandSeparator="," suffix=" đ" />
          }
        />
        <KpiCard label={t("dashboard.lowStock")} variant="red" value={stats?.lowStockCount ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CardItem title={t("dashboard.revenueByDay")} className="p-4 lg:col-span-2">
          <div ref={revenueRef} className="h-[240px] w-full relative" />
        </CardItem>
        <CardItem title={t("dashboard.ordersByDay")} className="p-4">
          <div ref={ordersRef} className="h-[240px] w-full relative" />
        </CardItem>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardItem title={t("dashboard.topProducts")} className="p-4">
          {!stats?.topProducts?.length ? (
            <p className="text-slate-400 text-sm py-4">{t("common.noData")}</p>
          ) : (
            <TMTable
              columns={[
                { title: t("dashboard.product"), dataIndex: "productName" },
                {
                  title: t("dashboard.quantitySold"),
                  dataIndex: "quantitySold",
                  width: 120,
                },
                {
                  title: t("financial.amount"),
                  dataIndex: "revenue",
                  width: 140,
                  render: (record) => (
                    <NumericFormat value={record.revenue} displayType={"text"} thousandSeparator="," suffix=" đ" />
                  ),
                },
              ]}
              data={stats.topProducts}
              rowKey="productId"
            />
          )}
        </CardItem>

        <CardItem title={`${t("dashboard.lowStock")} (≤10)`} className="p-4">
          {!stats?.lowStock?.length ? (
            <p className="text-slate-400 text-sm py-4">{t("common.noData")}</p>
          ) : (
            <TMTable
              columns={[
                { title: t("dashboard.product"), dataIndex: "product", render: (record) => record["product"]?.name },
                { title: t("dashboard.code"), dataIndex: "product", render: (record) => record["product"]?.code },
                {
                  title: t("dashboard.warehouse"),
                  dataIndex: "warehouse",
                  render: (record) => record["warehouse"]?.name,
                },
                {
                  title: t("dashboard.stock"),
                  dataIndex: "quantity",
                  width: 100,
                  render: (record) => (
                    <span
                      className={cn({
                        ["text-red-500"]: record.quantity <= 0,
                        ["text-orange-500"]: record.quantity > 0,
                      })}
                    >
                      {record.quantity}
                    </span>
                  ),
                },
              ]}
              data={stats.lowStock}
              rowKey="id"
            />
          )}
        </CardItem>
      </div>
    </div>
  );
}

const KpiCard = ({
  label,
  value,
  variant = "green",
}: {
  label: string;
  value: ReactNode;
  variant?: "green" | "red" | "blue" | "indigo";
}) => {
  return (
    <div className="bg-white dark:bg-slate-500 p-4 flex flex-col gap-2 rounded shadow-2xl shadow-slate-200 dark:shadow-slate-600">
      <span className="text-slate-500">{label}</span>
      <span
        className={cn("text-xl font-semibold", {
          ["text-green-600"]: variant === "green",
          ["text-red-600"]: variant === "red",
          ["text-blue-600"]: variant === "blue",
          ["text-indigo-600"]: variant === "indigo",
        })}
      >
        {value}
      </span>
    </div>
  );
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}
