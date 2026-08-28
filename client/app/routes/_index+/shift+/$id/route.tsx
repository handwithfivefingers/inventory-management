import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { NumericFormat } from "react-number-format";
import { shiftService } from "~/action.server/shift.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
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
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title={`${t("shift.title")} - ${data.code}`} className="p-4">
        <div className="grid grid-cols-2 gap-4">
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
      </CardItem>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}
