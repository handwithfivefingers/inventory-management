import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { NumericFormat } from "react-number-format";
import { financialService } from "~/action.server/financial.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
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
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title={`${t("financial.title")} - ${data.code}`} className="p-4">
        <div className="grid grid-cols-2 gap-4">
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
      </CardItem>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}
