import { useEffect, useState } from "react";
import { useTranslation } from "~/i18n";
import { formatCurrency } from "~/libs/format-currency";
import { IInvoice } from "~/types/invoice";
import { InputSlider } from "../form/input-slider";
import { SelectInput } from "../form/select-input";
import { Portal } from "../portal";

export interface IPrinterModel {
  id: string;
  label: string;
  paperSize: keyof typeof PRINT_SIZES;
  fontSize: number; // px
  letterSpacing: number; // px
  widthAdjust: number; // mm added/removed from the printable width
}

export const PRINT_SIZES: Record<string, { label: string; page: string; width: string; padding: string; margin: string }> = {
  k58: { label: "K58 (58mm)", page: "58mm auto", width: "48mm", padding: "3mm 2mm", margin: "0" },
  k80: { label: "K80 (80mm)", page: "80mm auto", width: "72mm", padding: "4mm 3mm", margin: "0" },
  a5: { label: "A5", page: "A5 portrait", width: "148mm", padding: "10mm", margin: "8mm" },
  a4: { label: "A4", page: "A4 portrait", width: "210mm", padding: "12mm", margin: "10mm" },
  // Bypass: no `@page size` rule is emitted, so the browser / printer-dialog
  // paper size wins instead of the forced size above.
  auto: { label: "Auto (printer default)", page: "auto", width: "100%", padding: "4mm", margin: "0" },
};

const PAPER_SIZE_OPTIONS = (Object.keys(PRINT_SIZES) as Array<keyof typeof PRINT_SIZES>).map((key) => ({
  label: PRINT_SIZES[key].label,
  value: key,
}));

/**
 * Print CSS for the browser path (`window.print`) — same pattern as
 * `BarcodePrintSheet` (`barcode-print-portal` + `body.barcode-printing`).
 *
 * Why a body-level portal instead of the old `visibility: hidden` trick:
 * - `visibility: hidden` keeps the hidden elements' layout space, and the old
 *   `.invoice-print { position: absolute; top: 0 }` anchored to the nearest
 *   positioned ancestor (the component's own `.relative` wrapper, which sits
 *   BELOW the config sliders) — so the printed receipt started mid-page
 *   instead of at the top.
 * - The portal is a direct child of `document.body`, so it always starts at
 *   the page top-left; everything else is `display: none` (no reserved space).
 * - Screen preview keeps its centered (`mx-auto`) layout; the print portal
 *   uses `margin: 0` + `text-align: left`.
 */
const getPrintStyles = (sizeKey: string) => {
  const size = PRINT_SIZES[sizeKey] ?? PRINT_SIZES.k80;
  // `auto` bypasses the forced paper size: no `@page size` rule, so the
  // browser / printer-dialog paper size wins.
  const pageRule = size.page === "auto" ? "" : `@page { size: ${size.page}; margin: ${size.margin}; }`;
  return `
.invoice-print-root { display: block; }
@media print {
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body.invoice-printing > *:not(.invoice-print-portal) { display: none !important; }
  body.invoice-printing > .invoice-print-portal {
    display: block !important;
    width: ${size.width};
    max-width: ${size.width};
    margin: 0;
    padding: ${size.padding};
    text-align: left;
    color: #000;
    background: #fff;
    box-sizing: border-box;
    box-shadow: none !important;
    border: none !important;
  }
  .no-print { display: none !important; }
  /* Long receipts: page breaks may fall BETWEEN items, never inside one
     (name on one page, price on the next). The portal itself stays
     breakable so Chrome flows excess content onto following pages. */
  .invoice-print-portal .thermal-item,
  .invoice-print-portal table tr { break-inside: avoid; page-break-inside: avoid; }
}
@media screen {
  .invoice-print-portal { display: none !important; }
}
${pageRule}
`;
};

/**
 * Browser-print the invoice portal — mirrors
 * `BarcodePrintModal.handleBrowserPrint`: toggles `body.invoice-printing`
 * around `window.print()` so the portal is the only visible node.
 */
export const printInvoiceViaBrowser = (): void => {
  if (typeof document === "undefined") return;
  document.body.classList.add("invoice-printing");
  const cleanup = () => {
    document.body.classList.remove("invoice-printing");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  // Fallback for browsers that don't fire `afterprint` reliably.
  window.setTimeout(cleanup, 1000);
};

const PRINTER_MODELS: IPrinterModel[] = [
  { id: "generic-k80", label: "Generic 80mm (K80)", paperSize: "k80", fontSize: 12, letterSpacing: 0, widthAdjust: 0 },
  { id: "xprinter-58", label: "Xprinter 58mm (K58)", paperSize: "k58", fontSize: 11, letterSpacing: 0, widthAdjust: 0 },
  {
    id: "bixolon-80",
    label: "Bixolon SRP-350 (K80)",
    paperSize: "k80",
    fontSize: 13,
    letterSpacing: 0.2,
    widthAdjust: -2,
  },
  { id: "custom", label: "Custom", paperSize: "k80", fontSize: 12, letterSpacing: 0, widthAdjust: 0 },
];

const PRINTER_STORAGE_KEY = "invoice-printer-settings";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  issued: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

/**
 * Reads the saved printer settings from localStorage.
 * Only call from client-side event handlers/effects — never during render
 * (would break SSR hydration).
 */
export const loadPrinterSettings = (): IPrinterModel => {
  try {
    const raw = localStorage.getItem(PRINTER_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as IPrinterModel;
      const preset = PRINTER_MODELS.find((m) => m.id === saved.id) ?? PRINTER_MODELS[0];
      return { ...preset, ...saved };
    }
  } catch {
    /* ignore corrupted storage */
  }
  return PRINTER_MODELS[0];
};

/**
 * Injects the @media-print / @page CSS into <head> imperatively.
 *
 * Deliberately NOT rendered as a JSX <style> element: its content depends on
 * client-only printer settings, so a server-rendered <style> would mismatch
 * during hydration. A plain DOM node created in an effect never participates
 * in SSR/hydration and is removed on unmount.
 */
const usePrintStyles = (paperSize: keyof typeof PRINT_SIZES) => {
  useEffect(() => {
    const el = document.createElement("style");
    el.dataset.receiptPrintStyle = paperSize;
    el.textContent = getPrintStyles(paperSize);
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, [paperSize]);
};

interface Props {
  invoice: IInvoice;
  /** Temp print: same receipt + "temporal invoice" footer line (orders flow). */
  temporal?: boolean;
  /** Order reference footer: "Thuộc đơn hàng #ORD-x — Hóa đơn i/n". */
  orderCode?: string | null;
  invoiceIndex?: number | null;
  invoiceTotal?: number | null;
}
export const ReceiptPrinter = ({ invoice, temporal, orderCode, invoiceIndex, invoiceTotal }: Props) => {
  // Hydration-safe: the first render (server AND client) must be identical, so we
  // start from the deterministic default preset and only read localStorage AFTER
  // mount. Reading it during render (useState(loadPrinterSettings)) makes the
  // server HTML differ from the client's first render → hydration mismatch.
  const [printer, setPrinter] = useState<IPrinterModel>(PRINTER_MODELS[0]);
  const [hydrated, setHydrated] = useState(false);
  const size = PRINT_SIZES[printer.paperSize] ?? PRINT_SIZES.k80;
  const isThermal = printer.paperSize === "k58" || printer.paperSize === "k80";
  const updatePrinter = (patch: Partial<IPrinterModel>) => setPrinter((prev) => ({ ...prev, ...patch }));

  usePrintStyles(printer.paperSize);

  // Load saved settings once after hydration…
  useEffect(() => {
    setPrinter(loadPrinterSettings());
    setHydrated(true);
  }, []);

  // …then persist every tweak (skipped until loaded, so defaults never overwrite storage)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(printer));
    } catch {
      /* storage unavailable */
    }
  }, [printer, hydrated]);

  const orderRef = orderCode ?? (invoice.order as any)?.code ?? (invoice.orderId ? `#${invoice.orderId}` : null);
  // Shared receipt content: screen preview === print portal (same pattern as
  // `BarcodePrintModal`'s `sheetProps`, so preview and print never diverge).
  const receiptBody = isThermal ? (
    <ThermalReceipt data={invoice} temporal={temporal} orderRef={orderRef} invoiceIndex={invoiceIndex} invoiceTotal={invoiceTotal} />
  ) : (
    <CustomReceipt data={invoice} temporal={temporal} orderRef={orderRef} invoiceIndex={invoiceIndex} invoiceTotal={invoiceTotal} />
  );
  // Inline styles win over the @media print rules, so the adjusted
  // font/spacing/width apply to both screen preview AND printing.
  const contentStyle = {
    fontSize: printer.fontSize,
    letterSpacing: `${printer.letterSpacing}px`,
    width: `calc(${size.width} + ${printer.widthAdjust}mm)`,
    padding: size.padding,
  };

  return (
    <div className="flex relative flex-col gap-4 bg-slate-100 rounded py-2">
      <div className="flex gap-1 justify-center flex-wrap no-print">
        <div className="w-44">
          <SelectInput
            label="Printer model"
            options={PRINTER_MODELS.map(({ id, label }) => ({ label, value: id }))}
            value={printer.id}
            onSelect={(v: any) => {
              const model = PRINTER_MODELS.find((m) => m.id === v);
              if (model) setPrinter({ ...model });
            }}
          />
        </div>
        <div className="w-32">
          {/* Independent paper-size selector: overrides the model preset so
              thermal (K58/K80) and A5/A4 sheets are switchable without
              changing the printer model itself. Persisted with the rest of
              the printer settings through the same localStorage record. */}
          <SelectInput
            label="Paper size"
            options={PAPER_SIZE_OPTIONS}
            value={printer.paperSize}
            onSelect={(v: any) => {
              if (PRINT_SIZES[v as string]) updatePrinter({ paperSize: v });
            }}
          />
        </div>
        <InputSlider
          min={10}
          max={20}
          step={1}
          label="Font size"
          value={printer.fontSize}
          onChange={(e) => updatePrinter({ fontSize: Number(e.target.value) })}
        />
        {/* QZ printer picker disabled — browser print only.
            Restore `<QzPrinterSelect />` here when re-enabling QZ. */}
        <InputSlider
          min={-4}
          max={4}
          step={1}
          label="Letter spacing"
          value={printer.letterSpacing}
          onChange={(e) => updatePrinter({ letterSpacing: Number(e.target.value) })}
        />
      </div>
      <div className={`invoice-print mx-auto bg-white shadow ${isThermal ? "font-mono" : ""}`} style={contentStyle}>
        {receiptBody}
      </div>
      {/* Body-level print copy: hidden on screen, sole visible node in print. */}
      <Portal>
        <div className="invoice-print-root invoice-print-portal">
          <div className={isThermal ? "font-mono" : ""} style={contentStyle}>
            {receiptBody}
          </div>
        </div>
      </Portal>
    </div>
  );
};

const ThermalReceipt = ({
  data,
  temporal,
  orderRef,
  invoiceIndex,
  invoiceTotal,
}: {
  data: IInvoice;
  temporal?: boolean;
  orderRef?: string | null;
  invoiceIndex?: number | null;
  invoiceTotal?: number | null;
}) => {
  const { t } = useTranslation();
  return (
    <div className="text-black">
      {/* Shop header */}
      <div className="text-center space-y-0.5">
        <h1 className="font-bold uppercase text-[1em] leading-tight">{data.vendor?.name || ""}</h1>
        <p className="text-[0.85em] text-gray-600">#{data.invoiceNumber}</p>
      </div>
      <Divider />

      {/* Receipt title */}
      <div className="text-center mb-2">
        <h2 className="font-bold uppercase text-[0.95em]">{t("invoices.detail.receiptTitle")}</h2>
      </div>

      {/* Metadata */}
      <div className="space-y-0.5 mb-2">
        <MetaRow label={t("invoices.detail.createdAt")} value={new Date(data.createdAt).toLocaleString("vi-VN")} />
        <MetaRow label={t("invoices.customer")} value={data.customer?.name || "-"} />
        <MetaRow label={t("invoices.detail.warehouse")} value={data.warehouse?.name || "-"} />
        <MetaRow
          label={t("invoices.detail.paymentType")}
          value={data.paymentType ? t(`invoices.detail.${data.paymentType}`) : "-"}
        />
        {data.dueDate && (
          <MetaRow label={t("invoices.detail.dueDate")} value={new Date(data.dueDate).toLocaleDateString("vi-VN")} />
        )}
        <MetaRow label={t("invoices.statusLabel")} value={t(`invoices.status.${data.status}`)} />
      </div>

      <Divider />

      {/* Line items — name on its own line, qty × price … amount below */}
      <div className="space-y-1.5">
        {(data.invoiceDetails || []).map((detail) => (
          <div key={detail.id} className="thermal-item space-y-0.5">
            <div className="font-bold leading-tight break-words text-[0.95em]">
              {(detail.product as any)?.name || `#${detail.productId}`}
            </div>
            <div className="flex justify-between text-[0.85em] text-gray-700">
              <span>
                {detail.quantity} x {formatCurrency(detail.unitPrice)}
              </span>
              <span className="font-bold text-black">{formatCurrency(detail.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>

      <Divider />

      {/* Totals */}
      <div className="space-y-1">
        <TotalRow label={t("invoices.detail.subtotalLabel")} value={formatCurrency(data.subtotal)} />
        <TotalRow label={t("invoices.detail.discount")} value={`-${formatCurrency(data.discount)}`} />
        <TotalRow label={t("invoices.detail.tax")} value={formatCurrency(data.taxAmount)} />
        <TotalRow label={t("invoices.detail.surcharge")} value={formatCurrency(data.surcharge)} />
        <TotalRow label={t("invoices.total")} value={formatCurrency(data.total)} emphasized />
        <TotalRow label={t("invoices.paidAmount")} value={formatCurrency(data.paid)} />
        <TotalRow label={t("invoices.remaining")} value={formatCurrency(data.remaining)} />
      </div>

      {/* Footer */}
      <div className="text-center space-y-1 mt-3">
        {/* QR payment slot — renders automatically once vendor data carries a VietQR image
            (e.g. add `qrCodeUrl` to IVendor; no code change needed here) */}
        {(data.vendor as any)?.qrCodeUrl && (
          <div className="flex flex-col items-center my-2 gap-1">
            <img
              src={(data.vendor as any).qrCodeUrl}
              alt="VietQR"
              className="w-20 h-20 object-contain border border-gray-300 bg-white p-1"
            />
            <span className="text-[0.7em] uppercase tracking-tight text-gray-600">{t("invoices.detail.scanQr")}</span>
          </div>
        )}
        {data.notes && <p className="text-[0.85em] italic break-words">{data.notes}</p>}
        {orderRef && (
          <p className="text-[0.8em] text-gray-700">
            {t("invoices.detail.orderRef", { defaultValue: `Thuộc đơn hàng ${orderRef}` })}
            {invoiceIndex != null && invoiceTotal != null
              ? ` — ${t("invoices.detail.batch", { defaultValue: `Hóa đơn ${invoiceIndex}/${invoiceTotal}` })}`
              : ""}
          </p>
        )}
        <p className="font-bold italic text-[0.85em]">{t("invoices.detail.thanks")}</p>
        {temporal && (
          <p className="text-[0.8em] uppercase tracking-wide text-gray-600 border-t border-dashed border-black pt-1 mt-2">
            {t("orders.tempInvoiceNotice")}
          </p>
        )}
      </div>
    </div>
  );
};

const CustomReceipt = ({
  data,
  temporal,
  orderRef,
  invoiceIndex,
  invoiceTotal,
}: {
  data: IInvoice;
  temporal?: boolean;
  orderRef?: string | null;
  invoiceIndex?: number | null;
  invoiceTotal?: number | null;
}) => {
  const { t } = useTranslation();
  const infoRows: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("invoices.invoiceNumber"), value: data.invoiceNumber },
    ...(orderRef
      ? [
          {
            label: t("invoices.detail.sourceOrder", { defaultValue: "Đơn hàng gốc" }),
            value: `${orderRef}${
              invoiceIndex != null && invoiceTotal != null ? ` — ${t("invoices.detail.batch", { defaultValue: `Đợt giao ${invoiceIndex}/${invoiceTotal}` })}` : ""
            }`,
          },
        ]
      : []),
    { label: t("invoices.customer"), value: data.customer?.name || "-" },
    { label: t("invoices.detail.warehouse"), value: data.warehouse?.name || "-" },
    {
      label: t("invoices.detail.paymentType"),
      value: data.paymentType ? t(`invoices.detail.${data.paymentType}`) : "-",
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
                <td className="p-2">{(detail.product as any)?.name || `#${detail.productId}`}</td>
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
      {temporal && (
        <p className="text-xs text-gray-500 text-center border-t pt-2">{t("orders.tempInvoiceNotice")}</p>
      )}
    </div>
  );
};

const Divider = () => <div className="border-b border-dashed border-black my-2" />;

const MetaRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between gap-2 text-[0.85em] leading-snug">
    <span className="shrink-0">{label}</span>
    <span className="font-medium truncate">{value}</span>
  </div>
);

const TotalRow = ({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) => (
  <div
    className={
      emphasized
        ? "flex justify-between font-bold text-[1.15em] border-t border-black pt-1 mt-1"
        : "flex justify-between text-[0.95em]"
    }
  >
    <span>{label}</span>
    <span className={emphasized ? "" : "font-medium"}>{value}</span>
  </div>
);
