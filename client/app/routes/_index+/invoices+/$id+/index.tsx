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
import { formatCurrency } from "~/libs/format-currency";
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

  // Explicit on-screen VAT breakdown — same math as the backend
  // `calculateLineTotals` helper and the order detail page:
  // base = qty × unitPrice − discount, tax = stored taxAmount ?? base × rate / 100.
  const details = data.invoiceDetails || [];
  const lineBaseOf = (d: any) => Number(d.quantity || 0) * Number(d.unitPrice || 0) - Number(d.discount || 0);
  const lineTaxOf = (d: any) => {
    const stored = Number(d.taxAmount ?? 0);
    if (stored) return stored;
    return (lineBaseOf(d) * Number(d.taxRate || 0)) / 100;
  };
  const subtotalExcVat = details.reduce((sum: number, d: any) => sum + lineBaseOf(d), 0);
  const vatTotal = details.length
    ? details.reduce((sum: number, d: any) => sum + lineTaxOf(d), 0)
    : Number(data.taxAmount || 0);

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
      <div className="w-full mx-auto">
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
              {/* <TMButton variant="ghost" size="sm" component={Link} to="/invoices" type="button">
                {t("common.cancel")}
              </TMButton> */}
              <TMButton size="sm" component={Link} to="/invoices">
                <Icon name="save" fontSize={16} />
                {t("common.save")}
              </TMButton>{" "}
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
          <div className="flex flex-col xl:flex-row gap-8">
            {/* Toolbar */}
            {/* Receipt preview + printer settings. The component injects its own
          print CSS into <head> after mount (hydration-safe). */}
            <ReceiptPrinter invoice={data} />
            {/* Explicit VAT breakdown (screen only — the receipt above is the print source) */}
            {details.length > 0 && (
              <div className="flex flex-col flex-1 gap-4">
                <h3 className="font-semibold text-xl py-3">Order</h3>
                <div className="border border-slate-200 dark:border-slate-700 rounded overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm text-slate-700 dark:text-slate-200">
                    <thead className="bg-gray-50 dark:bg-slate-700/60">
                      <tr>
                        <th className="p-2 text-left font-medium">{t("importOrder.product")}</th>
                        <th className="p-2 w-28 text-right font-medium">VAT (%)</th>
                        <th className="p-2 w-32 text-right font-medium">Tiền VAT</th>
                        <th className="p-2 w-32 text-right font-medium">Thành tiền (chưa VAT)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800">
                      {details.map((d: any) => (
                        <tr key={d.id} className="border-t border-slate-100 dark:border-slate-700">
                          <td className="p-2">
                            {(d.product as any)?.name || `#${d.productId ?? d.orderDetailId ?? d.id}`} × {d.quantity}
                          </td>
                          <td className="p-2 text-right">{Number(d.taxRate || 0)}%</td>
                          <td className="p-2 text-right">{formatCurrency(lineTaxOf(d))}</td>
                          <td className="p-2 text-right">{formatCurrency(lineBaseOf(d))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-end border-t border-slate-200 dark:border-slate-700 p-3">
                    <div className="w-full sm:w-72 sm:ml-auto space-y-2">
                      <div className="flex justify-between">
                        <span>Tạm tính (chưa VAT)</span>
                        <span className="font-medium">{formatCurrency(subtotalExcVat)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tổng VAT{data.VAT ? ` (${Number(data.VAT)}%)` : ""}</span>
                        <span className="font-medium">{formatCurrency(vatTotal)}</span>
                      </div>
                      {Number(data.discount || 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Giảm giá</span>
                          <span className="font-medium">{formatCurrency(data.discount)}</span>
                        </div>
                      )}
                      {Number(data.surcharge || 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Phụ thu</span>
                          <span className="font-medium">{formatCurrency(data.surcharge)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-700 pt-2">
                        <span>Tổng tiền thanh toán</span>
                        <span className="text-blue-600 dark:text-blue-400">{formatCurrency(data.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
