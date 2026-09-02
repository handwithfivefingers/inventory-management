import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { NumericFormat } from "react-number-format";
import { shiftService } from "~/action.server/shift.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { dayjs } from "~/libs/date";
import { parseCookieFromRequest } from "~/sessions";
import { useTranslation } from "~/i18n";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const { id } = params;
    const { cookie, vendorId } = await parseCookieFromRequest(request);
    const resp = await shiftService.getById(id as string, { cookie, vendorId });
    return { data: resp.data?.data ?? null };
  } catch (error) {
    throw new Response("error", { status: 404 });
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Chi tiết ca" }, { name: "description", content: "Chi tiết ca làm việc" }];
};

export default function ShiftDetail() {
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
                  <Icon name="clock" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                    {t("shift.title")} - {data.code}
                  </h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">Chi tiết ca làm việc</p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <span className="text-gray-500">{t("shift.openTime")}: </span>
              {dayjs(data.openTime).format("DD/MM/YYYY HH:mm")}
            </div>
            <div>
              <span className="text-gray-500">{t("shift.closeTime")}: </span>
              {data.closeTime ? dayjs(data.closeTime).format("DD/MM/YYYY HH:mm") : "-"}
            </div>
            <div>
              <span className="text-gray-500">{t("shift.openingCash")}: </span>
              <NumericFormat value={data.openingCash} displayType="text" thousandSeparator="," />
            </div>
            <div>
              <span className="text-gray-500">{t("shift.closingCash")}: </span>
              {data.closingCash != null ? (
                <NumericFormat value={data.closingCash} displayType="text" thousandSeparator="," />
              ) : (
                "-"
              )}
            </div>
            <div>
              <span className="text-gray-500">{t("shift.expectedCash")}: </span>
              {data.expectedCash != null ? (
                <NumericFormat value={data.expectedCash} displayType="text" thousandSeparator="," />
              ) : (
                "-"
              )}
            </div>
            <div>
              <span className="text-gray-500">{t("shift.difference")}: </span>
              {data.difference != null ? (
                <NumericFormat value={data.difference} displayType="text" thousandSeparator="," />
              ) : (
                "-"
              )}
            </div>
            <div>
              <span className="text-gray-500">{t("shift.status")}: </span>
              {data.status === "open" ? t("shift.open") : t("shift.close")}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-5">
            <TMButton variant="ghost" size="sm" component={Link} to="/shift" type="button">
              {t("common.cancel")}
            </TMButton>
            <TMButton size="sm" component={Link} to="/shift">
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
