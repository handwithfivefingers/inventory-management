import { useMemo } from "react";
import { BarCode } from "~/components/barcode";
import { BARCODE_DISPLAY_MAX_HEIGHT_MM } from "~/libs/barcode-label-layout";

export interface IBarcodeLabel {
  id: number | string;
  name: string;
  skuCode: string;
  price?: number | null;
  copies?: number;
}

/** Sheet / roll stocks. `t46` is the 100x150mm (4"x6") label stock. */
export type BarcodePaperSize = "a4" | "a5" | "t46" | "k80" | "k58";

/** Sheet specifications for each paper size */
export interface IBarcodeSheetSpec {
  page: string;
  pageMargin: string;
  label: string;
  defaultColumns: number;
  /** Printable width applied to the sheet in @media print */
  printWidth: string;
  /** Screen preview cap so thermal previews match real roll widths */
  previewMaxWidth: string;
  barcode: { width: number; height: number; fontSize: number };
}

/** Sheet / roll stocks with full specs */
export const BARCODE_SHEET_SPECS: Record<BarcodePaperSize, IBarcodeSheetSpec> = {
  a4: {
    page: "A4 portrait",
    pageMargin: "8mm",
    label: "A4",
    defaultColumns: 3,
    printWidth: "100%",
    previewMaxWidth: "100%",
    barcode: { width: 2.2, height: 40, fontSize: 16 },
  },
  a5: {
    page: "A5 portrait",
    pageMargin: "8mm",
    label: "A5",
    defaultColumns: 2,
    printWidth: "100%",
    previewMaxWidth: "100%",
    barcode: { width: 2, height: 40, fontSize: 16 },
  },
  t46: {
    page: "100mm 150mm",
    pageMargin: "2mm",
    label: "4x6 (100x150mm)",
    defaultColumns: 2,
    printWidth: "100%",
    previewMaxWidth: "100mm",
    barcode: { width: 1.6, height: 44, fontSize: 14 },
  },
  k80: {
    page: "80mm auto",
    pageMargin: "0",
    label: "K80 (80mm)",
    defaultColumns: 1,
    printWidth: "72mm",
    previewMaxWidth: "80mm",
    barcode: { width: 2, height: 50, fontSize: 14 },
  },
  k58: {
    page: "58mm auto",
    pageMargin: "0",
    label: "K58 (58mm)",
    defaultColumns: 1,
    printWidth: "48mm",
    previewMaxWidth: "58mm",
    barcode: { width: 1.4, height: 45, fontSize: 12 },
  },
};

/**
 * Print CSS for the browser path (`window.print`).
 *
 * Two instances of the sheet exist while the modal is open (same props,
 * so preview === print):
 * - preview: normal `.barcode-print-root` inside the modal, visible on screen.
 * - print portal: `.barcode-print-root.barcode-print-portal` portalled to
 *   `document.body`, hidden on screen, the ONLY visible element while printing
 *   (`body.barcode-printing` is toggled around `window.print()`).
 *
 * A separate body-level portal is required: the preview lives deep inside the
 * modal, and hiding the modal's ancestors for print would hide the preview
 * too. The print portal stays in normal flow with `break-after: page` for
 * natural multi-page pagination.
 */
const LABEL_STYLES = (sheet: IBarcodeSheetSpec) => `
.barcode-print-root { display: block; }
@media print {
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body.barcode-printing > *:not(.barcode-print-portal) { display: none !important; }
  body.barcode-printing > .barcode-print-portal {
    display: block !important;
    width: ${sheet.printWidth};
    max-width: ${sheet.printWidth};
    margin: 0 auto;
    color: #000;
    background: #fff;
  }
  .barcode-print-sheet {
    width: 100%;
    max-width: 100%;
    margin: 0;
    text-align: left;
    box-sizing: border-box;
  }
  .barcode-print-page { break-after: page; page-break-after: always; }
  .barcode-print-page:last-child { break-after: auto; page-break-after: auto; }
  .barcode-label { break-inside: avoid; page-break-inside: avoid; }
  .barcode-print-sheet svg {
    max-width: 100%;
    height: auto;
    display: block;
    margin-left: auto;
    margin-right: auto;
  }
  .no-print { display: none !important; }
}
@media screen {
  .barcode-print-portal { display: none !important; }
  .barcode-print-sheet svg {
    max-width: 100%;
    height: auto;
  }
  /* Preview page delineation (screen only — never printed): each chunked
     page renders as a dashed sheet with a "Trang N" badge so page breaks
     are visible before printing. */
  .barcode-print-page {
    border: 1px dashed #94a3b8;
    border-radius: 6px;
    padding: 8px;
    margin-bottom: 12px;
    position: relative;
    padding-top: 26px;
  }
  .barcode-print-page:last-child { margin-bottom: 0; }
  .barcode-page-badge {
    position: absolute;
    top: 4px;
    left: 8px;
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    background: #f1f5f9;
    border-radius: 4px;
    padding: 1px 8px;
    pointer-events: none;
  }
}
`;

/**
 * A print-optimized sheet of barcode labels.
 *
 * Features:
 * - `columns` controls labels per row (defaults to per-size default)
 * - `rowsPerPage > 0` chunks labels into fixed whole-label pages (each page
 *   breaks after itself — pass `estimateRowsPerPage(paperSize, { showPrice })`
 *   so pages provably fit the sheet); `0` = continuous flow for rolls.
 * - Preview instance lives inside the modal; the print instance must be rendered
 *   with `printPortal` into a body-level portal (see BarcodePrintModal) so the
 *   print CSS can isolate it. Both instances share the same props so
 *   preview === browser print === QZ print (QZ mirrors columns/showPrice).
 */
export const BarcodePrintSheet = ({
  labels,
  paperSize = "a4",
  showPrice = false,
  columns,
  rowsPerPage = 0,
  printPortal = false,
}: {
  labels: IBarcodeLabel[];
  paperSize?: BarcodePaperSize;
  showPrice?: boolean;
  columns?: number;
  rowsPerPage?: number;
  /** Render as the hidden body-level print portal (screen: hidden, print: only visible). */
  printPortal?: boolean;
}) => {
  const sheet = BARCODE_SHEET_SPECS[paperSize] ?? BARCODE_SHEET_SPECS.a4;
  const cols = Math.max(1, Math.min(4, Math.round(columns ?? sheet.defaultColumns)));

  // Expand copies into a flat list capped to a sane max
  const expanded = useMemo(() => {
    const out: IBarcodeLabel[] = [];
    for (const label of labels) {
      const copies = Math.max(1, Math.min(100, Number(label.copies) || 1));
      for (let i = 0; i < copies; i++) out.push(label);
    }
    return out.slice(0, 500);
  }, [labels]);

  // Chunk labels into pages when rowsPerPage is set (no padding: a short last
  // page renders fewer cells — padding with cloned labels would print
  // duplicates the user never asked for).
  const pages = useMemo(
    () => {
      if (rowsPerPage <= 0) return [expanded];
      const chunkSize = Math.max(1, rowsPerPage * cols);
      const result: IBarcodeLabel[][] = [];
      for (let i = 0; i < expanded.length; i += chunkSize) {
        result.push(expanded.slice(i, i + chunkSize));
      }
      return result;
    },
    [expanded, rowsPerPage, cols],
  );

  const formatPrice = (price?: number | null) =>
    price != null && Number(price) > 0 ? `${Number(price).toLocaleString("vi-VN")}đ` : "";

  return (
    <div className={printPortal ? "barcode-print-root barcode-print-portal" : "barcode-print-root"}>
      <style>{LABEL_STYLES(sheet)}</style>
      <style>{`@page { size: ${sheet.page}; margin: ${sheet.pageMargin}; }`}</style>
      {expanded.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">Chưa có tem nào để in.</p>
      ) : (
        <div className="barcode-print-sheet mx-auto" style={{ maxWidth: sheet.previewMaxWidth }}>
          {pages.map((page, pageIndex) => (
            <div
              key={pageIndex}
              className="barcode-print-page grid gap-2"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {pages.length > 1 && (
                <div
                  className="barcode-page-badge no-print"
                  style={{ gridColumn: `1 / span ${cols}` }}
                >
                  Trang {pageIndex + 1}/{pages.length}
                </div>
              )}
              {page.map((label, index) => (
                <div
                  key={`${label.id}-${pageIndex}-${index}`}
                  className="barcode-label flex flex-col items-center gap-0.5 border border-dashed border-slate-300 rounded p-1 text-center min-w-0 overflow-hidden"
                >
                  <span className="text-[11px] font-medium leading-tight line-clamp-2 max-w-full break-words">
                    {label.name}
                  </span>
                  {showPrice && formatPrice(label.price) && (
                    <span className="text-[11px] font-bold">{formatPrice(label.price)}</span>
                  )}
                  {label.skuCode ? (
                    <BarCode
                      code={label.skuCode}
                      width={sheet.barcode.width}
                      height={sheet.barcode.height}
                      fontSize={sheet.barcode.fontSize}
                      maxHeight={`${BARCODE_DISPLAY_MAX_HEIGHT_MM}mm`}
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Thiếu mã SKU</span>
                  )}
                  <span className="text-[10px] tracking-wide break-all">{label.skuCode}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};