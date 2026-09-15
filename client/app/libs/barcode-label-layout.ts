/**
 * Shared geometry for barcode-label printing.
 *
 * Both the browser sheet (`barcode-print-sheet`) and the QZ device HTML
 * (`buildBarcodeLabelsHtml`) paginate with the row count returned by
 * `estimateRowsPerPage`, so preview === browser print === device print.
 *
 * Why estimate instead of relying on CSS `break-inside: avoid`:
 * QZ rasterizers cut fixed-height sheets (t46/a4/a5) at exactly `@page`
 * height and ignore `break-inside: avoid` inside CSS grid — a label taller
 * than the remaining page space gets sliced (title on one page, barcode on
 * the next) plus blank/duplicated pages. Explicit whole-label pages whose
 * total height provably fits the sheet avoid the cut entirely.
 */

export type BarcodePaperSizeKey = "a4" | "a5" | "t46" | "k58" | "k80";

/** Physical page height in mm; `0` = continuous roll (`auto` page height). */
const PAGE_HEIGHT_MM: Record<BarcodePaperSizeKey, number> = {
  a4: 297,
  a5: 210,
  t46: 150,
  k80: 0,
  k58: 0,
};

/** `@page` margin in mm mirror of BARCODE_SHEET_SPECS. */
const PAGE_MARGIN_MM: Record<BarcodePaperSizeKey, number> = {
  a4: 8,
  a5: 8,
  t46: 2,
  k80: 0,
  k58: 0,
};

/** JsBarcode `height` option (px) mirror of BARCODE_SHEET_SPECS/LAYOUT_CONFIG. */
const BARCODE_HEIGHT_PX: Record<BarcodePaperSizeKey, number> = {
  a4: 40,
  a5: 40,
  t46: 44,
  k80: 50,
  k58: 45,
};

/**
 * Display cap for the rendered barcode SVG. Without a cap, short SKU codes
 * (narrow intrinsic SVG) stretch to the full column width with
 * `width: 100%`, ballooning the height (~21mm) and blowing the page budget.
 * 12mm stays easily scannable and bounds the row height on every stock.
 */
export const BARCODE_DISPLAY_MAX_HEIGHT_MM = 12;

/** Grid gap between labels in mm (device HTML uses label margins — see below). */
export const BARCODE_LABEL_GAP_MM = 2;

const PX_TO_MM = 25.4 / 96;
/** Extra headroom for raster rounding, font-metric differences, wrapped SKUs. */
const SAFETY_FACTOR = 1.1;

const clampInt = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(value)));

/**
 * Whole-label rows that provably fit one sheet.
 * - Rolls (`auto` height) return `0` = continuous flow, no pagination needed.
 * - `showPrice` adds one price line (~3.8mm) per label, so the estimate drops
 *   a row when the priced labels no longer fit — price display/hide is
 *   accounted for instead of overflowing the last row off the sheet.
 */
export const estimateRowsPerPage = (
  paperSize: string,
  opts?: { showPrice?: boolean },
): number => {
  const key = (paperSize in PAGE_HEIGHT_MM ? paperSize : "k80") as BarcodePaperSizeKey;
  const pageHeight = PAGE_HEIGHT_MM[key];
  if (!pageHeight) return 0;

  const showPrice = opts?.showPrice ?? false;
  const barcodeMm = Math.min(BARCODE_HEIGHT_PX[key] * PX_TO_MM, BARCODE_DISPLAY_MAX_HEIGHT_MM);
  const labelHeightMm =
    7.6 + // product name, clamped to 2 lines @11px
    (showPrice ? 3.8 : 0) + // price line @11px bold
    barcodeMm + // barcode SVG (capped)
    4.2 + // human-readable code (~1.5 lines @10.5px, covers wrapped SKUs)
    3 + // label padding (1.5mm each side)
    2.5; // SVG vertical margins
  const usableMm = pageHeight - PAGE_MARGIN_MM[key] * 2;
  const gap = BARCODE_LABEL_GAP_MM;
  return Math.max(1, Math.floor((usableMm + gap) / (labelHeightMm * SAFETY_FACTOR + gap)));
};

/** Clamp a user-supplied rows-per-page override into the sane range. */
export const normalizeRowsPerPage = (raw: unknown): number | null => {
  const n = Number(raw);
  if (!raw && raw !== 0) return null;
  if (!Number.isFinite(n) || n <= 0) return null;
  return clampInt(n, 1, 8);
};
