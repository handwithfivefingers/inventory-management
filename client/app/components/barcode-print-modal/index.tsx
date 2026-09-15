import { useMemo, useState } from "react";
import {
  BARCODE_SHEET_SPECS,
  BarcodePaperSize,
  BarcodePrintSheet,
  IBarcodeLabel,
} from "~/components/barcode-print-sheet";
import { SelectInput } from "~/components/form/select-input";
import { Icon } from "~/components/icon";
import { Portal } from "~/components/portal";
import { TMButton } from "~/components/tm-button";
import { TMModal } from "~/components/tm-modal";
import { useTranslation } from "~/i18n";
import { estimateRowsPerPage, normalizeRowsPerPage } from "~/libs/barcode-label-layout";
import { NumberStepper } from "../form/number-stepper";
import { SwitchInput } from "../form/switch-input";

const PAPER_OPTIONS: { label: string; value: BarcodePaperSize }[] = [
  { label: "A4", value: "a4" },
  { label: "A5", value: "a5" },
  { label: "T46 (100x150mm)", value: "t46" },
  { label: "K80 (80mm)", value: "k80" },
  { label: "K58 (58mm)", value: "k58" },
];

const COLUMN_OPTIONS = [1, 2, 3, 4].map((n) => ({ label: `${n} cột`, value: n }));

const ROW_OPTIONS = [
  { label: "Tự động", value: 0 },
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ label: `${n} hàng`, value: n })),
];

const normalizeCopies = (raw: unknown, fallback: number): number => Math.max(1, Math.min(100, Number(raw) || fallback));

const clampCopiesInput = (raw: unknown): number => {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(100, n));
};

/**
 * Modal shown from the products list "In mã vạch" action: configure and print
 * barcode labels for the selected products.
 * - Preview, browser print (`window.print`) and QZ thermal print share the
 *   same `labels` / `paperSize` / `columns` / `rowsPerPage` / `showPrice`
 *   props, so the three outputs stay identical.
 * - `rowsPerPage` is auto-estimated per paper size and price display (a priced
 *   label is one line taller, so fewer rows fit); the "rows" control can
 *   override it when product names are unusually long/short.
 * - Browser print renders a hidden body-level `.barcode-print-portal` copy of
 *   the sheet (same props as the preview) and toggles
 *   `body.barcode-printing` around `window.print()` — the portal is the only
 *   thing visible in `@media print`.
 */
export const BarcodePrintModal = ({
  show,
  close,
  labels,
}: {
  show: boolean;
  close: () => void;
  labels: IBarcodeLabel[];
}) => {
  const { t } = useTranslation();
  const [paperSize, setPaperSize] = useState<BarcodePaperSize>("t46");
  const [showPrice, setShowPrice] = useState(true);
  const [defaultCopies, setDefaultCopies] = useState(1);
  const [columns, setColumns] = useState<number>(BARCODE_SHEET_SPECS.a5.defaultColumns);
  const [rowsOverride, setRowsOverride] = useState<number | null>(null);
  // QZ thermal printing is disabled — browser print only.
  // NOTE (re-enable later): restore `printing` state, `qzConfirmed` confirm
  // flow, `handleDevicePrint` via `printBarcodesToDevice`, and
  // `<QzPrinterSelect>` (see git history).

  const handlePaperChange = (v: unknown) => {
    const next = String(v) as BarcodePaperSize;
    if (next === "a4" || next === "a5" || next === "t46" || next === "k80" || next === "k58") {
      setPaperSize(next);
      // Follow the per-size default so rolls (1 col) don't preview as sheets.
      setColumns(BARCODE_SHEET_SPECS[next].defaultColumns);
      setRowsOverride(null);
    }
  };

  const effectiveLabels = useMemo(
    () => labels.map((l) => ({ ...l, copies: normalizeCopies(l.copies, defaultCopies) })),
    [labels, defaultCopies],
  );
  const totalItems = effectiveLabels.reduce((sum, l) => sum + l.copies!, 0);

  // Price-aware pagination: priced labels are one line taller, so fewer rows
  // fit per sheet. Explicit override wins (rolls always flow continuously).
  const autoRows = estimateRowsPerPage(paperSize, { showPrice });
  const rowsPerPage = rowsOverride ?? autoRows;
  const isPaginated = rowsPerPage > 0;
  const totalPages = isPaginated ? Math.max(1, Math.ceil(totalItems / Math.max(1, rowsPerPage * columns))) : 1;

  // Shared sheet props: preview === browser print portal === QZ HTML input.
  const sheetProps = useMemo(
    () => ({ labels: effectiveLabels, paperSize, showPrice, columns, rowsPerPage }),
    [effectiveLabels, paperSize, showPrice, columns, rowsPerPage],
  );

  const handleBrowserPrint = () => {
    if (totalItems === 0) return;
    if (typeof document === "undefined") return;
    document.body.classList.add("barcode-printing");
    const cleanup = () => {
      document.body.classList.remove("barcode-printing");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    // Fallback for browsers that don't fire `afterprint` reliably.
    window.setTimeout(cleanup, 1000);
  };

  if (!show) return null;

  return (
    <>
      <TMModal open={show} close={close} width={720} title={t("common.printBarcode")}>
        <div className="flex flex-col gap-3 w-full">
          {/* Config — hidden when printing */}
          <div className="flex gap-3 flex-wrap items-end no-print">
            <div className="">
              <SelectInput label="Khổ giấy" options={PAPER_OPTIONS} value={paperSize} onSelect={handlePaperChange} />
            </div>
            <div className="flex items-end gap-2">
              <div className="pb-0.5">
                <NumberStepper
                  label="Số lượng"
                  value={defaultCopies}
                  onValueChange={(v) => setDefaultCopies(clampCopiesInput(v.value))}
                />
              </div>
            </div>
            <div className="mt-2">
              <SelectInput
                label="Cột mỗi trang"
                options={COLUMN_OPTIONS}
                value={columns}
                onSelect={(v: any) => {
                  const next = Math.max(1, Math.min(4, Math.round(Number(v) || 1)));
                  setColumns(next);
                }}
              />
            </div>

            {isPaginated && (
              <div className="mt-2">
                <SelectInput
                  label={`Hàng mỗi trang (auto ${autoRows})`}
                  options={ROW_OPTIONS}
                  value={rowsOverride ?? 0}
                  onSelect={(v: any) => setRowsOverride(normalizeRowsPerPage(v))}
                />
              </div>
            )}

            <SwitchInput checked={showPrice} onChange={(e: any) => setShowPrice(e.target.checked)} />
          </div>

          {/* Pagination summary — mirrors the page badges in the preview below */}
          <div className="text-xs text-slate-500 no-print">
            {totalItems} tem • {columns} cột •{" "}
            {isPaginated ? `${rowsPerPage} hàng/trang • ${totalPages} trang` : "cuộn liên tục (khổ cuộn)"}
          </div>

          {/* Preview — same props as the print portal + QZ HTML below */}
          <div className="max-h-[50vh] overflow-auto border border-slate-200 rounded p-3 bg-white">
            <BarcodePrintSheet {...sheetProps} />
          </div>

          <div className="flex justify-end gap-2 no-print">
            <TMButton variant="ghost" size="sm" onClick={close}>
              {t("common.cancel")}
            </TMButton>
            <TMButton size="sm" onClick={handleBrowserPrint} disabled={totalItems === 0}>
              <Icon name="printer" fontSize={14} />
              In qua trình duyệt
            </TMButton>
          </div>
        </div>
      </TMModal>
      {/* Body-level print copy: hidden on screen, sole visible node in print. */}
      <Portal>
        <BarcodePrintSheet {...sheetProps} printPortal />
      </Portal>
    </>
  );
};
