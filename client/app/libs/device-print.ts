/**
 * Direct thermal-receipt printing via QZ Tray using ESC/POS commands.
 *
 * The browser page sends raw ESC/POS bytes (built below) to the local QZ Tray
 * agent over its localhost websocket; QZ spools them to the OS-selected
 * printer. Works in any browser once QZ Tray is installed on the POS PC —
 * no WebUSB permission picker, no USB-class filter. Returns `false` so
 * callers can fall back to `window.print()` when QZ is offline.
 *
 * Note: most budget thermal printers don't render UTF-8 Vietnamese, so text
 * is transliterated (diacritics stripped) before sending.
 */

import JsBarcode from "jsbarcode";
import { printHtml, setLastQzError } from "~/libs/qz-print";
import { BARCODE_DISPLAY_MAX_HEIGHT_MM, BARCODE_LABEL_GAP_MM, estimateRowsPerPage } from "~/libs/barcode-label-layout";

const ESC = 0x1b;
const GS = 0x1d;

export interface IReceiptLine {
  text: string;
  bold?: boolean;
  center?: boolean;
  large?: boolean;
}

export interface IReceipt {
  title: string;
  subtitle?: string;
  lines: IReceiptLine[];
  footer?: string;
}

/**
 * Front-end printer configuration (the same model shown in the receipt preview).
 * Maps onto real ESC/POS commands:
 * - paperSize    → usable character columns (58mm rolls are narrower than 80mm)
 * - fontSize     → GS ! n character magnification (Font A ≈ 12px at 1×)
 * - letterSpacing → ESC SP n right-side character spacing (in dots)
 * - widthAdjust  → shifts the printable width in mm before computing columns
 */
export interface IPrinterConfig {
  paperSize?: "a4" | "a5" | "t46" | "k58" | "k80";
  fontSize?: number; // px
  letterSpacing?: number; // px
  widthAdjust?: number; // mm
}

/* Geometry: printable width in mm for each paper type (thermal rolls use printable area,
   sheets use the full paper width; t46 is the 100x150mm / 4"x6" label stock) */
const PAPER_WIDTH_MM: Record<string, number> = { k58: 48, k80: 72, t46: 100, a5: 148, a4: 210 };
const DOTS_PER_MM = 8;
const FONT_A_WIDTH_DOTS = 12;

/** Layout configuration mirroring SHEET_SIZES in barcode-print-sheet for HTML generation */
interface ILayoutConfig {
  columns: number;
  pageSize: string;
  barcodeWidth: number;
  barcodeHeight: number;
  fontSize: number;
}

/** Layout config for each supported paper size (row pagination: see estimateRowsPerPage) */
const LAYOUT_CONFIG: Record<string, ILayoutConfig> = {
  a4: { columns: 3, pageSize: "A4 portrait", barcodeWidth: 2.2, barcodeHeight: 40, fontSize: 16 },
  a5: { columns: 2, pageSize: "A5 portrait", barcodeWidth: 2, barcodeHeight: 40, fontSize: 16 },
  t46: { columns: 2, pageSize: "100mm 150mm", barcodeWidth: 1.6, barcodeHeight: 44, fontSize: 14 },
  k80: { columns: 1, pageSize: "80mm auto", barcodeWidth: 2, barcodeHeight: 50, fontSize: 14 },
  k58: { columns: 1, pageSize: "58mm auto", barcodeWidth: 1.4, barcodeHeight: 45, fontSize: 12 },
};

/** Character magnification (1–7×) derived from the preview font size */
const charScale = (fontSizePx?: number): number => Math.min(7, Math.max(1, Math.round((fontSizePx ?? 12) / 12)));

/**
 * Characters per line for the given config — accounts for the roll width,
 * the user's width adjustment AND the font magnification (bigger font ⇒ fewer
 * columns). Callers use this to pad/align two-column rows.
 */
export const getReceiptColumns = (config?: IPrinterConfig): number => {
  const cfg = { paperSize: "k80", fontSize: 12, widthAdjust: 0, ...(config ?? {}) };
  const printableMm = (PAPER_WIDTH_MM[cfg.paperSize] ?? PAPER_WIDTH_MM.k80) + (cfg.widthAdjust ?? 0);
  const rawColumns = Math.floor((printableMm * DOTS_PER_MM) / FONT_A_WIDTH_DOTS);
  return Math.max(16, Math.floor(rawColumns / charScale(cfg.fontSize)));
};

/** Remove Vietnamese diacritics for ESC/POS codepage compatibility */
export const stripDiacritics = (input: string): string =>
  input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(stripDiacritics(text));

const concat = (chunks: Uint8Array[]): Uint8Array => {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
};

/** GS ! n size byte from a 0–7 magnitude (0 = 1×, both width & height) */
const sizeByte = (magnitude: number): number => (magnitude << 4) | magnitude;

/** Build raw ESC/POS bytes for the receipt, honouring the printer config */
export const buildEscPosBytes = (receipt: IReceipt, config?: IPrinterConfig): Uint8Array => {
  const scale = charScale(config?.fontSize);
  // 1 preview px ≈ 2 dots of right-side character spacing (clamped for safety)
  const spacingDots = Math.min(64, Math.max(0, Math.round((config?.letterSpacing ?? 0) * 2)));

  const chunks: Uint8Array[] = [
    new Uint8Array([ESC, 0x40]), // ESC @ — initialize printer
  ];

  if (spacingDots > 0) {
    chunks.push(new Uint8Array([ESC, 0x20, spacingDots])); // ESC SP n — char spacing
  }
  if (scale > 1) {
    chunks.push(new Uint8Array([GS, 0x21, sizeByte(scale - 1)])); // GS ! n — base magnification
  }

  // Title: centered + double the body size
  chunks.push(new Uint8Array([ESC, 0x61, 0x01])); // ESC a n — center
  if (scale < 7) {
    chunks.push(new Uint8Array([GS, 0x21, sizeByte(scale)]));
  }
  chunks.push(new Uint8Array([ESC, 0x45, 0x01])); // ESC E n — bold on
  chunks.push(utf8(receipt.title));
  chunks.push(new Uint8Array([10]));
  chunks.push(new Uint8Array([ESC, 0x45, 0x00])); // bold off
  chunks.push(new Uint8Array([GS, 0x21, sizeByte(scale - 1)])); // back to body size

  if (receipt.subtitle) {
    chunks.push(utf8(receipt.subtitle));
    chunks.push(new Uint8Array([10]));
  }
  chunks.push(new Uint8Array([10]));

  // Body lines
  for (const line of receipt.lines) {
    chunks.push(new Uint8Array([ESC, 0x61, line.center ? 0x01 : 0x00]));
    if (line.bold) chunks.push(new Uint8Array([ESC, 0x45, 0x01]));
    if (line.large && scale < 7) {
      chunks.push(new Uint8Array([GS, 0x21, sizeByte(scale)])); // one step above body size
    }
    chunks.push(utf8(line.text));
    chunks.push(new Uint8Array([10]));
    if (line.large && scale < 7) {
      chunks.push(new Uint8Array([GS, 0x21, sizeByte(scale - 1)]));
    }
    if (line.bold) chunks.push(new Uint8Array([ESC, 0x45, 0x00]));
  }

  if (receipt.footer) {
    chunks.push(new Uint8Array([10, 10]));
    chunks.push(new Uint8Array([ESC, 0x61, 0x01])); // center
    chunks.push(utf8(receipt.footer));
    chunks.push(new Uint8Array([10]));
  }

  // Feed + partial cut
  chunks.push(new Uint8Array([ESC, 0x64, 0x04])); // ESC d n — feed 4 lines
  chunks.push(new Uint8Array([GS, 0x56, 0x42, 0x00])); // GS V B — partial cut

  return concat(chunks);
};

/**
 * Build raw ESC/POS bytes for one barcode label.
 * Encodes the code with GS k (CODE128 auto-detection by most firmwares),
 * prints a human-readable name line above and the code below.
 * `paperSize` narrows the barcode module + name width for 58mm rolls.
 */
export const buildBarcodeLabelBytes = (
  label: { name: string; code: string },
  opts?: { paperSize?: "a4" | "a5" | "t46" | "k58" | "k80" },
): Uint8Array => {
  const narrow = opts?.paperSize === "k58" || opts?.paperSize === "t46";
  const chunks: Uint8Array[] = [
    new Uint8Array([ESC, 0x40]), // ESC @ — initialize printer
    new Uint8Array([ESC, 0x61, 0x01]), // center
  ];
  const name = stripDiacritics(label.name).slice(0, narrow ? 30 : 42);
  if (name) {
    chunks.push(new Uint8Array([ESC, 0x21, 0x10])); // ESC ! — double-height name
    chunks.push(utf8(name));
    chunks.push(new Uint8Array([10]));
    chunks.push(new Uint8Array([ESC, 0x21, 0x00]));
  }
  // CODE128-B only supports printable ASCII; drop anything the barcode can't encode.
  const code = stripDiacritics(label.code).replace(/[^\x20-\x7e]/g, "");
  if (code) {
    const payload = utf8(code); // pure ASCII here, so bytes.length === code.length
    // GS k m CODE128: m=73, n = payload bytes + 2-char "{B" code-set selector.
    // n is a single byte, so cap the code to fit (255 - 2).
    const data = payload.slice(0, 253);
    // CODE128-B width ≈ (11 * chars + 35) * module dots; shrink the module
    // when a long code would overflow the roll.
    // Printable dots: K58 ≈ 384, K80 ≈ 576, T46 ≈ 720 (100mm @ 7.2 dots/mm)
    const printableDots = narrow ? 384 : 576;
    const moduleWidth = (11 * data.length + 35) * 2 <= printableDots ? (narrow ? 0x01 : 0x02) : 0x01;
    chunks.push(new Uint8Array([GS, 0x48, 0x00])); // GS H — no auto HRI (we print it manually)
    chunks.push(new Uint8Array([GS, 0x68, 0x50])); // GS h — barcode height (80 dots)
    chunks.push(new Uint8Array([GS, 0x77, moduleWidth])); // GS w — module width
    chunks.push(new Uint8Array([GS, 0x6b, 73, data.length + 2, 0x7b, 0x42]));
    chunks.push(data);
    chunks.push(new Uint8Array([10, 10]));
    chunks.push(data);
    chunks.push(new Uint8Array([10, 10, 10])); // feed
  } else {
    chunks.push(new Uint8Array([10, 10, 10])); // no barcode — just feed past the name
  }
  chunks.push(new Uint8Array([GS, 0x56, 0x42, 0x00])); // partial cut
  return concat(chunks);
};

/**
 * Print `copies` barcode labels for each entry via QZ Tray (HTML through the
 * OS driver — see `printHtml`). Labels flow continuously matching the
 * on-screen preview layout (`columns` / `showPrice` mirror the preview props
 * so device output === preview). Returns true on success.
 */
export const printBarcodesToDevice = async (
  labels: { name: string; code: string; copies?: number; price?: number | null }[],
  opts?: { paperSize?: "a4" | "a5" | "t46" | "k58" | "k80"; columns?: number; showPrice?: boolean; rowsPerPage?: number },
): Promise<boolean> => {
  const expanded: { name: string; code: string; price?: number | null }[] = [];
  for (const label of labels) {
    const copies = Math.max(1, Math.min(100, Number(label.copies) || 1));
    for (let i = 0; i < copies; i++) expanded.push({ name: label.name, code: label.code, price: label.price });
  }
  if (!expanded.length) return false;
  const paperSize = opts?.paperSize ?? "k80";
  try {
    await printHtml(buildBarcodeLabelsHtml(expanded, opts), undefined, {
      pageWidth: PAPER_WIDTH_MM[paperSize] ?? 72,
    });
    setLastQzError(null);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setLastQzError(message);
    console.warn("[qz-print:barcode] print failed", error);
    return false;
  }
};

/**
 * Send the receipt to the QZ Tray printer (saved name or OS default) as HTML
 * through the OS driver. `config` carries the same settings as the on-screen
 * receipt preview so the printed output matches it. Resolves `true` on
 * success; `false` when QZ Tray is offline or printing fails (caller should
 * fall back to window.print()).
 */
export const printReceiptToDevice = async (receipt: IReceipt, config?: IPrinterConfig): Promise<boolean> => {
  try {
    await printHtml(buildReceiptHtml(receipt, config), undefined, {
      pageWidth: PAPER_WIDTH_MM[config?.paperSize ?? "k80"] ?? 72,
    });
    setLastQzError(null);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setLastQzError(message);
    console.warn("[qz-print:receipt] print failed", error);
    return false;
  }
};

/* ------------------------------------------------------------------ */
/* HTML builders (pixel/html path — driver-rendered, Unicode-capable)  */
/* ------------------------------------------------------------------ */

/** Escape user text for embedding in the QZ HTML payload. */
export const escapeHtml = (input: string): string =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const RECEIPT_WIDTH_MM: Record<string, number> = { k58: 48, k80: 72, t46: 100, a5: 148, a4: 210 };

/** Return layout config for a given paper size, mirroring barcode-print-sheet */
const getLayoutConfig = (paperSize: string): ILayoutConfig =>
  LAYOUT_CONFIG[paperSize] ?? LAYOUT_CONFIG.k80;

/**
 * Build a self-contained HTML receipt for QZ `pixel/html` printing.
 * Uses @page size + continuous-roll layout so QZ does not paginate mid-content.
 * Vietnamese diacritics are kept (driver renders Unicode). Pre-padded `row()`
 * strings are rendered in monospace with pre-wrap; flex rows would also work
 * but keeping single-string preserves existing call sites.
 */
export const buildReceiptHtml = (receipt: IReceipt, config?: IPrinterConfig): string => {
  const paperSize: string = config?.paperSize ?? "k80";
  const widthMm = PAPER_WIDTH_MM[paperSize] ?? 72;
  const layout = getLayoutConfig(paperSize);
  const fontPx = Math.min(20, Math.max(10, Math.round(config?.fontSize ?? layout.fontSize)));
  const css = `
    @page { size: ${widthMm}mm auto; margin: 0; }
    html,body { margin:0; padding:0; background:#fff; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    * { box-sizing:border-box; }
    body { width:${widthMm}mm; padding:2mm 2mm 4mm 2mm; font-family: monospace, "Courier New", monospace; }
    .line { white-space:pre-wrap; word-break:break-word; overflow-wrap:break-word; break-inside:avoid; page-break-inside:avoid; line-height:1.35; }
  `;
  const line = (l: IReceiptLine): string => {
    const align = l.center ? "center" : "left";
    const weight = l.bold ? "700" : "400";
    const size = l.large ? Math.min(22, fontPx + 4) : fontPx;
    // Use <pre> semantics via CSS so padded spaces are preserved exactly.
    return `<div class="line" style="text-align:${align};font-weight:${weight};font-size:${size}px;">${escapeHtml(l.text) || "&nbsp;"}</div>`;
  };
  return (
    `<html><head><meta charset="utf-8"><style>${css}</style></head>` +
    `<body>` +
    `<div style="text-align:center;font-weight:700;font-size:${Math.min(22, fontPx + 4)}px;word-break:break-word;">${escapeHtml(receipt.title) || "&nbsp;"}</div>` +
    (receipt.subtitle
      ? `<div style="text-align:center;font-size:${fontPx}px;white-space:pre-wrap;word-break:break-word;margin-top:1mm;">${escapeHtml(receipt.subtitle)}</div>`
      : "") +
    `<div style="font-size:${fontPx}px;margin-top:3mm;">${receipt.lines.map(line).join("")}</div>` +
    (receipt.footer
      ? `<div style="text-align:center;font-size:${fontPx}px;margin-top:4mm;white-space:pre-wrap;word-break:break-word;">${escapeHtml(receipt.footer)}</div>`
      : "") +
    `</body></html>`
  );
};

/**
 * Render a CODE128 barcode as an inline SVG string via JsBarcode.
 * Runs in the browser only; returns "" when rendering fails so the caller
 * can fall back to the human-readable code text. SVG is made responsive
 * (max-width:100%) so it never overflows the container.
 * `barcodeWidth` / `barcodeHeight` override the auto-calculated module size
 * so the printed barcode matches the on-screen preview.
 */
export const barcodeSvgString = (
  code: string,
  opts?: { paperSize?: "a4" | "a5" | "t46" | "k58" | "k80" },
  barcodeWidth?: number,
  barcodeHeight?: number,
): string => {
  if (typeof document === "undefined") return "";
  try {
    const clean = code.replace(/[^\x20-\x7e]/g, "").trim();
    if (!clean) return "";
    // Use provided dimensions (matching preview) when available,
    // otherwise fall back to auto-calculated module width based on code length.
    const width = barcodeWidth ?? (clean.length > 14 ? 1 : clean.length > 10 ? 1.35 : opts?.paperSize === "k58" ? 1.4 : opts?.paperSize === "t46" ? 1.6 : 1.9);
    const height = barcodeHeight ?? 48;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, clean, {
      format: "CODE128",
      width,
      height,
      displayValue: false,
      margin: 0,
    });
    let str = new XMLSerializer().serializeToString(svg);
    // Make SVG fluid for the container width — QZ rasterizes the resulting HTML
    str = str.replace("<svg", '<svg style="max-width:100%;height:auto;display:block;" preserveAspectRatio="xMidYMid meet"');
    return str;
  } catch {
    return "";
  }
};

/**
 * Build a self-contained HTML sheet of barcode labels for QZ `pixel/html`
 * printing. Layout mirrors the on-screen preview (grid columns, barcode
 * dimensions, optional price, fixed rows-per-page chunking).
 *
 * Pagination is explicit: labels are chunked into whole-label `.page` blocks
 * (one grid per page, `page-break-after: always`). A single continuous grid
 * must NOT span a fixed-height sheet (t46/a4/a5) — QZ rasterizers cut the page
 * at exactly `@page` height and ignore `break-inside: avoid` inside CSS grid,
 * which slices labels in half (title on one page, barcode on the next) and
 * emits blank/duplicated pages. Rolls (`auto` height) keep one continuous
 * block since there is no page cut to straddle.
 */
export const buildBarcodeLabelsHtml = (
  labels: { name: string; code: string; price?: number | null }[],
  opts?: { paperSize?: "a4" | "a5" | "t46" | "k58" | "k80"; columns?: number; showPrice?: boolean; rowsPerPage?: number },
): string => {
  const paperSize = opts?.paperSize ?? "k80";
  const widthMm = PAPER_WIDTH_MM[paperSize] ?? 72;
  const layout = getLayoutConfig(paperSize);
  const cols = Math.max(1, Math.min(4, Math.round(opts?.columns ?? layout.columns)));
  const showPrice = opts?.showPrice ?? false;
  // Whole-label pages sized by the shared estimator (price-aware): the page
  // content provably fits the sheet, so QZ never cuts mid-label. An explicit
  // rowsPerPage override (modal "rows" control) wins over the estimate.
  const estimated = estimateRowsPerPage(paperSize, { showPrice });
  const rowsPerPage =
    opts?.rowsPerPage != null && Number.isFinite(Number(opts.rowsPerPage)) && Number(opts.rowsPerPage) > 0
      ? Math.max(1, Math.min(8, Math.round(Number(opts.rowsPerPage))))
      : estimated;
  const halfGap = BARCODE_LABEL_GAP_MM / 2;
  const css = `
    @page { size: ${layout.pageSize}; margin: 0; }
    html,body { margin:0; padding:0; background:#fff; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    * { box-sizing:border-box; }
    body { width:${widthMm}mm; }
    .page { width:100%; page-break-after:always; break-after:page; }
    .page:last-child { page-break-after:auto; break-after:auto; }
    /* NOTE: spacing via label margins, not grid gap — older QZ renderers
       ignore grid-gap, which glued neighbouring labels together. */
    .labels { display:grid; grid-template-columns:repeat(${cols}, 1fr); gap:0; width:100%; }
    .label { text-align:center; padding:1.5mm; margin:${halfGap}mm; break-inside:avoid; page-break-inside:avoid; overflow:hidden; }
    /* Never stretch short-code barcodes to full column width (that ballooned
       label height and overflowed the page): shrink-to-fit + height cap. */
    .label svg { max-width:100% !important; width:auto !important; max-height:${BARCODE_DISPLAY_MAX_HEIGHT_MM}mm !important; height:auto !important; display:block; margin:0 auto; }
    .label .name { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; max-height:2.6em; line-height:1.3; }
  `;
  const formatPrice = (price?: number | null) =>
    price != null && Number(price) > 0 ? `${Number(price).toLocaleString("vi-VN")}đ` : "";
  const card = (label: { name: string; code: string; price?: number | null }): string => {
    const svg = barcodeSvgString(label.code, { paperSize }, layout.barcodeWidth, layout.barcodeHeight);
    const priceText = showPrice ? formatPrice(label.price) : "";
    return `<div class="label">` +
      (label.name
        ? `<div class="name" style="font-family:sans-serif;font-size:11px;font-weight:700;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(label.name)}</div>`
        : "") +
      (priceText
        ? `<div style="font-family:sans-serif;font-size:11px;font-weight:700;">${escapeHtml(priceText)}</div>`
        : "") +
      (svg ? `<div style="max-width:100%;margin:1.5mm auto 1mm auto;display:block;">${svg}</div>` : "") +
      (label.code
        ? `<div style="font-family:monospace;font-size:10.5px;letter-spacing:0.6px;word-break:break-all;overflow-wrap:break-word;">${escapeHtml(label.code)}</div>`
        : `<div style="font-family:monospace;font-size:9px;color:#999;">Trống mã</div>`) +
      `</div>`;
  };
  // Chunk into whole-label pages so no label ever straddles a page cut.
  // rowsPerPage <= 0 (rolls): single continuous block, no pagination needed.
  const chunkSize = rowsPerPage > 0 ? Math.max(1, rowsPerPage * cols) : labels.length || 1;
  const pages: string[] = [];
  for (let i = 0; i < labels.length; i += chunkSize) {
    const cards = labels.slice(i, i + chunkSize).map(card).join("");
    pages.push(`<div class="page"><div class="labels">${cards}</div></div>`);
  }
  return `<html><head><meta charset="utf-8"><style>${css}</style></head><body>${pages.join("")}</body></html>`;
};
