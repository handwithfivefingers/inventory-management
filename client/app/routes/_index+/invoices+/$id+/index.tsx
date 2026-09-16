import { ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useRouteError, useSearchParams } from "@remix-run/react";
import { useEffect } from "react";
import { invoiceService } from "~/action.server/invoice.service";
import { CardItem } from "~/components/card-item";
import { Icon } from "~/components/icon";
import { PermissionGuard } from "~/components/permission-guard";
import { ReceiptPrinter, printInvoiceViaBrowser } from "~/components/receipt-printer";
import { TMButton } from "~/components/tm-button";
import { MODULE_ENUM } from "~/constants/modules";
import { useTranslation } from "~/i18n";
import { IInvoice } from "~/types/invoice";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const resp = await invoiceService.getInvoiceById(params.id as string);
  return {
    invoice: (resp.data as any)?.data ?? resp.data,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const id = Number(formData.get("id"));
  try {
    await invoiceService.updateInvoiceStatus({
      id,
      status: formData.get("status") as any,
    });
    return new Response(null, { status: 200 });
  } catch (error: any) {
    return { error: error.message || "Request failed" };
  }
}

export const meta: MetaFunction = () => {
  return [{ title: "Chi tiết hóa đơn" }, { name: "description", content: "Chi tiết hóa đơn" }];
};

export default function InvoiceDetail() {
  const { invoice } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const { t } = useTranslation();
  const data = invoice as IInvoice;
  const [searchParams] = useSearchParams();

  const handleMarkAsPaid = () => {
    fetcher.submit({ id: String(data.id), status: "paid" }, { method: "post" });
  };
  const handleIssue = () => {
    fetcher.submit({ id: String(data.id), status: "issued" }, { method: "post" });
  };

  // QZ Tray device printing is disabled — browser print only.
  // NOTE (re-enable later): restore `handleDevicePrint` via
  // `printReceiptToDevice` + `loadPrinterSettings` (see git history).

  // Support ?print=true (way B): auto-trigger browser print after the
  // printable portal (ReceiptPrinter's Portal) has mounted and hydrated.
  // The print helper itself waits for the portal DOM + injected print <style>
  // before calling window.print(), so a blank snapshot never occurs.
  useEffect(() => {
    if (searchParams.get("print") === "true" && data?.id) {
      // Defer one tick so ReceiptPrinter's Portal second commit + style injection complete.
      const timer = window.setTimeout(() => {
        void printInvoiceViaBrowser();
      }, 400);
      return () => window.clearTimeout(timer);
    }
  }, [searchParams, data?.id]);

  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-5xl w-full mx-auto">
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="file-text" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">Chi tiết hóa đơn</h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">{data.invoiceNumber}</p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
          action={
            <div className="flex gap-2 justify-center items-center flex-wrap">
              <TMButton variant="outline" type="button" onClick={printInvoiceViaBrowser} size="sm">
                🖨 {t("invoices.detail.print")}
              </TMButton>
              {data.status === "draft" && (
                <>
                  <PermissionGuard permission="UPDATE" module="invoice">
                    <TMButton size="sm" to={`/invoices/${data.id}/edit`} component={Link}>
                      {t("common.edit")}
                    </TMButton>
                  </PermissionGuard>
                  <PermissionGuard permission="UPDATE" module={MODULE_ENUM.invoice} requireAdmin>
                    <TMButton size="sm" onClick={handleIssue} variant="outline">
                      {t("invoices.markAsIssued", { defaultValue: "Issue" })}
                    </TMButton>
                  </PermissionGuard>
                </>
              )}
              {data.status === "issued" && (
                <PermissionGuard permission="UPDATE" module={MODULE_ENUM.invoice} requireAdmin>
                  <TMButton size="sm" onClick={handleMarkAsPaid}>
                    {t("invoices.markAsPaid")}
                  </TMButton>
                </PermissionGuard>
              )}
            </div>
          }
        >
          <div className="flex flex-col gap-2">
            {/* Toolbar */}
            {/* Receipt preview + printer settings. The component injects its own
          print CSS into <head> after mount (hydration-safe). */}
            <ReceiptPrinter invoice={data} />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
              <TMButton variant="ghost" size="sm" component={Link} to="/invoices" type="button">
                {t("common.cancel")}
              </TMButton>
              <TMButton size="sm" component={Link} to="/invoices">
                <Icon name="save" fontSize={16} />
                {t("common.save")}
              </TMButton>
            </div>
          </div>
        </CardItem>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return <div className="p-4 text-red-600">Lỗi: {(error as any).message}</div>;
}
