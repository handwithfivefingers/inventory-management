import { ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useRouteError } from "@remix-run/react";
import { invoiceService } from "~/action.server/invoice.service";
import { TMButton } from "~/components/tm-button";
import { PermissionGuard } from "~/components/permission-guard";
import { IInvoice } from "~/types/invoice";
import { formatCurrency } from "~/libs/format-currency";
import { parseCookieFromRequest } from "~/sessions";
import {
  IReceipt,
  IPrinterConfig,
  printReceiptToDevice,
  getReceiptColumns,
  stripDiacritics,
} from "~/libs/device-print";
import { useState } from "react";
import { useTranslation } from "~/i18n";
import { ReceiptPrinter, loadPrinterSettings } from "~/components/receipt-printer";
import { CardItem } from "~/components/card-item";
import { Icon } from "~/components/icon";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const resp = await invoiceService.getInvoiceById({ id: params.id as string, cookie, vendorId });

  return {
    invoice: (resp.data as any)?.data ?? resp.data,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const formData = await request.formData();
  const id = Number(formData.get("id"));

  try {
    await invoiceService.updateInvoiceStatus({
      id,
      status: formData.get("status") as any,
      cookie,
      vendorId,
    });
    return new Response(null, { status: 200 });
  } catch (error: any) {
    return { error: error.message || "Request failed" };
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Chi tiết hóa đơn" }, { name: "description", content: "Chi tiết hóa đơn" }];
};

export default function InvoiceDetail() {
  const { invoice } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const { t } = useTranslation();
  const data = invoice as IInvoice;

  const handleMarkAsPaid = () => {
    fetcher.submit({ id: String(data.id), status: "paid" }, { method: "post" });
  };

  // Direct USB (ESC/POS) printing — falls back to the browser dialog.
  // Reads the saved printer model so the printed receipt matches the on-screen
  // preview. Safe to read localStorage here: this only runs on click (client).
  const [devicePrinting, setDevicePrinting] = useState(false);
  const handleDevicePrint = async () => {
    setDevicePrinting(true);
    try {
      const settings = loadPrinterSettings();
      // Device printing is thermal-only; A5/A4 fall back to printer defaults
      const deviceConfig: IPrinterConfig | undefined =
        settings.paperSize === "k58" || settings.paperSize === "k80"
          ? {
              paperSize: settings.paperSize,
              fontSize: settings.fontSize,
              letterSpacing: settings.letterSpacing,
              widthAdjust: settings.widthAdjust,
            }
          : undefined;

      // Columns shrink with a bigger font / narrower roll, so rows align correctly
      const width = getReceiptColumns(deviceConfig);
      const row = (left: string, right: string) => {
        const l = stripDiacritics(left);
        const r = stripDiacritics(right);
        return l + " ".repeat(Math.max(1, width - l.length - r.length)) + r;
      };
      const details = data.invoiceDetails || [];
      const receipt: IReceipt = {
        title: data.vendor?.name || "",
        subtitle: `${t("invoices.detail.receiptTitle")} - ${data.invoiceNumber}`,
        lines: [
          // KiotViet-style items: product name on its own line, qty x price … amount below
          ...details.flatMap((detail) => [
            { text: (detail.product as any)?.name || `#${detail.productId}`, bold: true },
            {
              text: row(`  ${detail.quantity} x ${formatCurrency(detail.unitPrice)}`, formatCurrency(detail.subtotal)),
            },
          ]),
          { text: "-".repeat(width) },
          { text: row(t("invoices.detail.subtotalLabel"), formatCurrency(data.subtotal)) },
          { text: row(t("invoices.detail.discount"), `-${formatCurrency(data.discount)}`) },
          { text: row(t("invoices.detail.tax"), formatCurrency(data.taxAmount)) },
          { text: row(t("invoices.detail.surcharge"), formatCurrency(data.surcharge)) },
          { text: "" },
          { text: row(t("invoices.total"), formatCurrency(data.total)), bold: true, large: true },
          { text: row(t("invoices.paidAmount"), formatCurrency(data.paid)) },
          { text: row(t("invoices.remaining"), formatCurrency(data.remaining)), bold: true },
          ...(data.notes ? [{ text: "" }, { text: data.notes }] : []),
          { text: "" },
          { text: t("invoices.detail.thanks"), center: true },
        ],
        footer: undefined,
      };
      const ok = await printReceiptToDevice(receipt, deviceConfig);
      if (!ok) window.print();
    } finally {
      setDevicePrinting(false);
    }
  };

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
        >
          <div className="flex flex-col gap-5 mt-2">
            {/* Toolbar */}
            {/* Receipt preview + printer settings. The component injects its own
          print CSS into <head> after mount (hydration-safe). */}
            <div className="flex justify-center mx-auto items-center shrink-0 no-print">
              <div className="flex gap-2 justify-center items-center flex-wrap">
                <TMButton variant="outline" type="button" onClick={handleDevicePrint} loading={devicePrinting} size="sm">
                  🖨️ {t("invoices.detail.printDevice")}
                </TMButton>
                <TMButton variant="outline" type="button" onClick={() => window.print()} size="sm">
                  🖨 {t("invoices.detail.print")}
                </TMButton>
                {data.status === "draft" && (
                  <PermissionGuard permission="UPDATE" module="invoice">
                    <TMButton size="sm" to={`/invoices/${data.id}/edit`} component={Link}>
                      {t("common.edit")}
                    </TMButton>
                  </PermissionGuard>
                )}
                {data.status === "issued" && (
                  <PermissionGuard permission="UPDATE" module="invoice">
                    <TMButton size="sm" onClick={handleMarkAsPaid}>
                      {t("invoices.markAsPaid")}
                    </TMButton>
                  </PermissionGuard>
                )}
              </div>
            </div>
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
