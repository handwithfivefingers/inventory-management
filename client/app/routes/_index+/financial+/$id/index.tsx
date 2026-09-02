import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { NumericFormat } from "react-number-format";
import { financialService } from "~/action.server/financial.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { dayjs } from "~/libs/date";
import { parseCookieFromRequest } from "~/sessions";
import { useTranslation } from "~/i18n";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const { cookie, vendorId } = await parseCookieFromRequest(request);
    const { id } = params;
    const resp = await financialService.getVoucherById(id as string, { cookie, vendorId });
    return {
      data: resp.data?.data ?? null,
    };
  } catch (error) {
    throw new Response("error", { status: 404 });
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Chi tiết phiếu" }, { name: "description", content: "Chi tiết phiếu thu/chi" }];
};

export default function FinancialDetail() {
  const { data } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  if (!data) return <div className="p-4">No data</div>;
  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-3xl w-full mx-auto">
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="credit-card" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                    {t("financial.title")} - {data.code}
                  </h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">Chi tiết phiếu thu/chi</p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <span className="text-gray-500">{t("financial.type")}: </span>
              <span className={data.type === "expense" ? "text-red-500" : "text-green-500"}>
                {data.type === "expense" ? t("financial.expense") : t("financial.revenue")}
              </span>
            </div>
            <div>
              <span className="text-gray-500">{t("financial.category")}: </span>
              {data.category}
            </div>
            <div>
              <span className="text-gray-500">{t("financial.amount")}: </span>
              <NumericFormat value={data.amount} displayType={"text"} thousandSeparator="," />
            </div>
            <div>
              <span className="text-gray-500">{t("financial.date")}: </span>
              {dayjs(data.transactionDate).format("DD/MM/YYYY HH:mm")}
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">{t("financial.note")}: </span>
              {data.note || "-"}
            </div>
            {data.relatedType && (
              <div>
                <span className="text-gray-500">Related: </span>
                {data.relatedType} #{data.relatedId}
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-5">
            <TMButton variant="ghost" size="sm" component={Link} to="/financial" type="button">
              {t("common.cancel")}
            </TMButton>
            <TMButton size="sm" component={Link} to="/financial">
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
