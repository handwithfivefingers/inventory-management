import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { NumericFormat } from "react-number-format";
import type { ReactNode } from "react";
import { useState } from "react";
import { financialService } from "~/action.server/financial.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { DateRangePicker } from "~/components/form/date-picker";
import { PermissionGuard } from "~/components/permission-guard";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { useTranslation } from "~/i18n";
import { dayjs } from "~/libs/date";
import { cn } from "~/libs/utils";
import { parseCookieFromRequest } from "~/sessions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { cookie, warehouseId, vendorId } = await parseCookieFromRequest(request);
    const url = new URL(request.url);
    const params = url.searchParams;
    const page = params.get("page") || "1";
    const pageSize = params.get("pageSize") || "10";
    const type = params.get("type") || "";

    // Optional date-range filter (?from=YYYY-MM-DD&to=YYYY-MM-DD), defaults to the current month
    const now = dayjs();
    const fromParam = dayjs(params.get("from") || "");
    const toParam = dayjs(params.get("to") || "");
    const from = fromParam.isValid() ? fromParam.startOf("day") : now.startOf("month");
    const to =
      toParam.isValid() && toParam.valueOf() >= fromParam.valueOf() ? toParam.endOf("day") : now.endOf("month");
    const rangeQuery = { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };

    // Summary of the selected period, compared with the previous period of the same length
    const duration = to.diff(from, "day") + 1;
    const previousTo = from.subtract(1, "day");
    const previousFrom = previousTo.subtract(duration - 1, "day");
    const [currentReport, previousReport] = await Promise.all([
      financialService.getReport({
        warehouseId: warehouseId as string,
        vendorId,
        ...rangeQuery,
        cookie,
      }),
      financialService.getReport({
        warehouseId: warehouseId as string,
        vendorId,
        from: previousFrom.format("YYYY-MM-DD"),
        to: previousTo.format("YYYY-MM-DD"),
        cookie,
      }),
    ]);

    const resp = await financialService.getVouchers({
      warehouseId: warehouseId as string,
      vendorId,
      page,
      pageSize,
      type,
      ...rangeQuery,
      cookie,
    });

    return {
      data: resp.data?.data ?? [],
      total: resp.data?.total ?? 0,
      page: Number(page),
      pageSize: Number(pageSize),
      from: rangeQuery.from,
      to: rangeQuery.to,
      summary: {
        current: currentReport.data?.data ?? defaultSummary(),
        previous: previousReport.data?.data ?? defaultSummary(),
      },
    };
  } catch (error) {
    throw new Response("error", { status: 404 });
  }
};

const defaultSummary = () => ({
  revenue: 0,
  importCost: 0,
  otherExpense: 0,
  totalExpense: 0,
  netProfit: 0,
  vatCollected: 0,
});

export const meta: MetaFunction = () => {
  return [{ title: "Tài chính" }, { name: "description", content: "Quản lý tài chính" }];
};

export default function Financial() {
  const { data, total, page, pageSize, summary, from, to } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [range, setRange] = useState({ from, to });

  /** Navigate while keeping every current filter, optionally overriding some. */
  const navigateWith = (overrides: Record<string, string>) => {
    const search = new URLSearchParams(window.location.search);
    Object.entries(overrides).forEach(([key, value]) => {
      if (value) search.set(key, value);
      else search.delete(key);
    });
    search.delete("page");
    navigate(`?${search.toString()}`);
  };

  return (
    <div className="w-full flex flex-col p-2 gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <SummaryCard
          label={t("financial.revenue")}
          value={<Money value={summary?.current?.revenue} />}
          variant="green"
          delta={renderDelta(summary?.current?.revenue, summary?.previous?.revenue, t("financial.vsPreviousPeriod"))}
        />
        <SummaryCard
          label={t("financial.totalExpense")}
          value={<Money value={summary?.current?.totalExpense} />}
          variant="red"
          delta={renderDelta(
            summary?.current?.totalExpense,
            summary?.previous?.totalExpense,
            t("financial.vsPreviousPeriod"),
          )}
        />
        <SummaryCard
          label={t("financial.netProfit")}
          value={<Money value={summary?.current?.netProfit} />}
          variant="indigo"
          delta={renderDelta(
            summary?.current?.netProfit,
            summary?.previous?.netProfit,
            t("financial.vsPreviousPeriod"),
          )}
        />
      </div>
      <CardItem title={t("financial.title")} className="p-4">
        <div className="py-2">
          <div className="flex gap-2 items-center justify-end flex-wrap">
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
          <div className="flex gap-2 items-end flex-wrap mt-2">
            <DateRangePicker
              fromLabel={t("financial.from")}
              toLabel={t("financial.to")}
              from={range.from}
              to={range.to}
              onChange={setRange}
              clearable
            />
            <TMButton
              size="sm"
              variant="light"
              disabled={!range.from || !range.to}
              onClick={() => navigateWith({ from: range.from, to: range.to })}
            >
              {t("common.apply")}
            </TMButton>
            <TMButton
              size="sm"
              variant="ghost"
              onClick={() => {
                setRange({ from: "", to: "" });
                navigateWith({ from: "", to: "" });
              }}
            >
              {t("common.reset")}
            </TMButton>
          </div>
        </div>
        <div className="flex gap-2 flex-col items-end animate__animated animate__faster animate__fadeIn">
          <TMTable
            columns={[
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
                render: (record) => <NumericFormat value={record.amount} displayType={"text"} thousandSeparator="," />,
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
              onPageChange={(page: number) => navigateWith({ page: String(page) })}
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

const Money = ({ value }: { value?: number }) => (
  <NumericFormat value={value ?? 0} displayType={"text"} thousandSeparator="," suffix=" đ" />
);

/** Percent change vs the previous month, e.g. "+12% ...". */
const renderDelta = (current?: number, previous?: number, suffixLabel?: string) => {
  if (previous === undefined || previous === null || previous === 0 || !current) return undefined;
  const percent = Math.round(((current - previous) / previous) * 100);
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent}% ${suffixLabel ?? ""}`;
};

const SummaryCard = ({
  label,
  value,
  delta,
  variant = "green",
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  variant?: "green" | "red" | "indigo";
}) => {
  return (
    <div className="bg-white p-4 flex flex-col gap-2 rounded shadow-2xl shadow-slate-200">
      <span>{label}</span>
      <span
        className={cn("text-xl font-semibold", {
          ["text-green-600"]: variant === "green",
          ["text-red-600"]: variant === "red",
          ["text-primary"]: variant === "indigo",
        })}
      >
        {value}
      </span>
      {delta != null && <span className="text-xs text-slate-500">{delta}</span>}
    </div>
  );
};
