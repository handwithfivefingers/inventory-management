import { ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useRouteError } from "@remix-run/react";
import { invoiceService } from "~/action.server/invoice.service";
import { CardItem } from "~/components/card-item";
import { TMButton } from "~/components/tm-button";
import { PermissionGuard } from "~/components/permission-guard";
import { IInvoice } from "~/types/invoice";
import { formatCurrency } from "~/libs/format-currency";
import { IReceipt, printReceiptToDevice, stripDiacritics } from "~/libs/device-print";
import { useState } from "react";
import { useTranslation } from "~/i18n";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  issued: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const cookie = request.headers.get("cookie") as string;
  const resp = await invoiceService.getInvoiceById({ id: params.id as string, cookie });

  return {
    invoice: (resp.data as any)?.data ?? resp.data,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const cookie = request.headers.get("cookie") as string;
  const formData = await request.formData();
  const id = Number(formData.get("id"));

  try {
    await invoiceService.updateInvoiceStatus({
      id,
      status: formData.get("status") as any,
      cookie,
    });
    return new Response(null, { status: 200 });
  } catch (error: any) {
    return { error: error.message || "Request failed" };
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Chi tiết hóa đơn" }, { name: "description", content: "Chi tiết hóa đơn" }];
};

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden; }
  .invoice-print, .invoice-print * { visibility: visible; }
  .invoice-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 24px;
    box-shadow: none !important;
    border: none !important;
  }
  .no-print { display: none !important; }
}
`;

export default function InvoiceDetail() {
  const { invoice } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const { t } = useTranslation();
  const data = invoice as IInvoice;

  const handleMarkAsPaid = () => {
    fetcher.submit({ id: String(data.id), status: "paid" }, { method: "post" });
  };

  // Direct USB (ESC/POS) printing — falls back to the browser dialog
  const [devicePrinting, setDevicePrinting] = useState(false);
  const handleDevicePrint = async () => {
    setDevicePrinting(true);
    try {
      const width = 42;
      const row = (left: string, right: string) => {
        const l = stripDiacritics(left);
        const r = stripDiacritics(right);
        return l + " ".repeat(Math.max(1, width - l.length - r.length)) + r;
      };
      const details = data.invoiceDetails || [];
      const receipt: IReceipt = {
        title: data.invoiceNumber,
        subtitle: `${data.vendor?.name || ""} - ${new Date(data.createdAt).toLocaleString("vi-VN")}`,
        lines: [
          ...details.map((detail) => ({
            text: row(
              `${(detail.product as any)?.name || `#${detail.productId}`} x${detail.quantity}`,
              formatCurrency(detail.subtotal),
            ),
          })),
          { text: "-".repeat(width) },
          { text: row(t("invoices.detail.subtotalLabel"), formatCurrency(data.subtotal)) },
          { text: row(t("invoices.detail.discount"), `-${formatCurrency(data.discount)}`) },
          { text: row(t("invoices.detail.tax"), formatCurrency(data.taxAmount)) },
          { text: row(t("invoices.detail.surcharge"), formatCurrency(data.surcharge)) },
          { text: "" },
          { text: row(t("invoices.total"), formatCurrency(data.total)), bold: true, large: true },
          { text: row(t("invoices.paidAmount"), formatCurrency(data.paid)) },
          { text: row(t("invoices.remaining"), formatCurrency(data.remaining)), bold: true },
        ],
        footer: data.notes || undefined,
      };
      const ok = await printReceiptToDevice(receipt);
      if (!ok) window.print();
    } finally {
      setDevicePrinting(false);
    }
  };

  const infoRows: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("invoices.invoiceNumber"), value: data.invoiceNumber },
    { label: t("invoices.customer"), value: data.customer?.name || "-" },
    { label: t("invoices.detail.warehouse"), value: data.warehouse?.name || "-" },
    {
      label: t("invoices.detail.paymentType"),
      value: t(`invoices.detail.${data.paymentType}`),
    },
    {
      label: t("invoices.detail.dueDate"),
      value: data.dueDate ? new Date(data.dueDate).toLocaleDateString("vi-VN") : "-",
    },
    {
      label: t("invoices.detail.createdAt"),
      value: new Date(data.createdAt).toLocaleString("vi-VN"),
    },
  ];

  return (
    <div className="w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <style>{PRINT_STYLES}</style>

      {/* Toolbar */}
      <div className="flex justify-between items-center shrink-0 no-print">
        <Link to="/invoices" className="text-blue-600 hover:underline text-sm">
          ← {t("common.back")}
        </Link>
        <div className="flex gap-2">
          <TMButton variant="outline" type="button" onClick={handleDevicePrint} loading={devicePrinting}>
            🖨️ {t("invoices.detail.printDevice")}
          </TMButton>
          <TMButton variant="outline" type="button" onClick={() => window.print()}>
            🖨 {t("invoices.detail.print")}
          </TMButton>
          {data.status === "draft" && (
            <PermissionGuard permission="U" module="invoice">
              <Link to={`${data.id}/edit`}>
                <TMButton>{t("common.edit")}</TMButton>
              </Link>
            </PermissionGuard>
          )}
          {data.status === "issued" && (
            <PermissionGuard permission="U" module="invoice">
              <button onClick={handleMarkAsPaid} className="text-green-700 bg-green-100 rounded px-4 py-2 text-sm font-medium hover:bg-green-200">
                {t("invoices.markAsPaid")}
              </button>
            </PermissionGuard>
          )}
        </div>
      </div>

      {/* Printable area */}
      <CardItem title={t("invoices.detail.title")} className="p-6 h-full overflow-auto invoice-print">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <p className="text-lg font-bold">{data.vendor?.name || ""}</p>
              <p className="text-sm text-gray-500">{data.invoiceNumber}</p>
            </div>
            <span className={`px-3 py-1 rounded text-sm ${STATUS_COLORS[data.status]}`}>
              {t(`invoices.status.${data.status}`)}
            </span>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {infoRows.map((row) => (
              <div key={row.label}>
                <p className="text-xs text-gray-500 uppercase">{row.label}</p>
                <p className="text-sm font-medium">{row.value}</p>
              </div>
            ))}
          </div>

          {/* Items */}
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">{t("invoices.detail.product")}</th>
                  <th className="p-2 w-24 text-right">{t("invoices.detail.quantity")}</th>
                  <th className="p-2 w-32 text-right">{t("invoices.detail.unitPrice")}</th>
                  <th className="p-2 w-20 text-right">{t("invoices.detail.taxRate")}</th>
                  <th className="p-2 w-32 text-right">{t("invoices.detail.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {(data.invoiceDetails || []).map((detail) => (
                  <tr key={detail.id} className="border-t">
                    <td className="p-2">
                      {(detail.product as any)?.name || `#${detail.productId}`}
                    </td>
                    <td className="p-2 text-right">{detail.quantity}</td>
                    <td className="p-2 text-right">{formatCurrency(detail.unitPrice)}</td>
                    <td className="p-2 text-right">{detail.taxRate || 0}%</td>
                    <td className="p-2 text-right">{formatCurrency(detail.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between">
                <span>{t("invoices.detail.subtotalLabel")}</span>
                <span className="font-medium">{formatCurrency(data.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("invoices.detail.discount")}</span>
                <span className="font-medium">-{formatCurrency(data.discount)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("invoices.detail.tax")}</span>
                <span className="font-medium">{formatCurrency(data.taxAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("invoices.detail.surcharge")}</span>
                <span className="font-medium">{formatCurrency(data.surcharge)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>{t("invoices.total")}</span>
                <span className="text-blue-600">{formatCurrency(data.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("invoices.paidAmount")}</span>
                <span className="font-medium text-green-700">{formatCurrency(data.paid)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{t("invoices.remaining")}</span>
                <span className={Number(data.remaining) > 0 ? "text-red-600" : "text-gray-500"}>
                  {formatCurrency(data.remaining)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs text-gray-500 uppercase mb-1">{t("invoices.detail.notes")}</p>
            <p className="text-sm">{data.notes || t("invoices.detail.noNotes")}</p>
          </div>
        </div>
      </CardItem>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return <div className="p-4 text-red-600">Lỗi: {(error as any).message}</div>;
}
