import { useEffect, useState } from "react";
import { useTranslation } from "~/i18n";
import { formatCurrency } from "~/libs/format-currency";
import { IInvoice } from "~/types/invoice";
import { InputSlider } from "../form/input-slider";
import { SelectInput } from "../form/select-input";

export interface IPrinterModel {
  id: string;
  label: string;
  paperSize: keyof typeof PRINT_SIZES;
  fontSize: number; // px
  letterSpacing: number; // px
  widthAdjust: number; // mm added/removed from the printable width
}

const PRINT_SIZES: Record<string, { label: string; page: string; width: string; padding: string; margin: string }> = {
  k58: { label: "K58 (58mm)", page: "58mm auto", width: "48mm", padding: "3mm 2mm", margin: "0" },
  k80: { label: "K80 (80mm)", page: "80mm auto", width: "72mm", padding: "4mm 3mm", margin: "0" },
  a5: { label: "A5", page: "A5 portrait", width: "148mm", padding: "10mm", margin: "8mm" },
  a4: { label: "A4", page: "A4 portrait", width: "210mm", padding: "12mm", margin: "10mm" },
};

const getPrintStyles = (sizeKey: string) => {
  const size = PRINT_SIZES[sizeKey] ?? PRINT_SIZES.k80;
  return `
        @media print {
        body * { visibility: hidden; }
        .invoice-print, .invoice-print * { visibility: visible; }
        .invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: ${size.width};
            max-width: none;
            padding: ${size.padding};
            box-shadow: none !important;
            border: none !important;
        }
        .no-print { display: none !important; }
        }
        @page {
        size: ${size.page};
        margin: ${size.margin};
        }
`;
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
}
export const ReceiptPrinter = ({ invoice }: Props) => {
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

  return (
    <div className="flex relative flex-col gap-4 bg-slate-100 rounded py-2">
      <div className="flex gap-1 justify-center">
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
        <InputSlider
          min={10}
          max={20}
          step={1}
          label="Font size"
          value={printer.fontSize}
          onChange={(e) => updatePrinter({ fontSize: Number(e.target.value) })}
        />
        <InputSlider
          min={-4}
          max={4}
          step={1}
          label="Letter spacing"
          value={printer.letterSpacing}
          onChange={(e) => updatePrinter({ letterSpacing: Number(e.target.value) })}
        />
      </div>
      <div
        className={`invoice-print mx-auto bg-white shadow ${isThermal ? "font-mono" : ""}`}
        style={{
          // Inline styles win over the @media print rules, so the adjusted
          // font/spacing/width apply to both screen preview AND printing.
          fontSize: printer.fontSize,
          letterSpacing: `${printer.letterSpacing}px`,
          width: `calc(${size.width} + ${printer.widthAdjust}mm)`,
          padding: size.padding,
        }}
      >
        {isThermal ? <ThermalReceipt data={invoice} /> : <CustomReceipt data={invoice} />}
      </div>
    </div>
  );
};

const ThermalReceipt = ({ data }: { data: IInvoice }) => {
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
          <div key={detail.id} className="space-y-0.5">
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
        <p className="font-bold italic text-[0.85em]">{t("invoices.detail.thanks")}</p>
      </div>
    </div>
  );
};

const CustomReceipt = ({ data }: { data: IInvoice }) => {
  const { t } = useTranslation();
  const infoRows: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("invoices.invoiceNumber"), value: data.invoiceNumber },
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
