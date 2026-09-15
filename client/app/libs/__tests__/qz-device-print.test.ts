import { describe, it, expect } from "vitest";
import { bytesToHex, describeQzError, getLastQzError, setLastQzError } from "../qz-print";
import {
  buildBarcodeLabelBytes,
  buildBarcodeLabelsHtml,
  buildEscPosBytes,
  getReceiptColumns,
  stripDiacritics,
} from "../device-print";

describe("bytesToHex", () => {
  it("encodes bytes as lowercase hex", () => {
    expect(bytesToHex(new Uint8Array([0x1b, 0x40, 0xff]))).toBe("1b40ff");
  });

  it("returns empty string for empty input", () => {
    expect(bytesToHex(new Uint8Array([]))).toBe("");
  });
});

describe("getReceiptColumns", () => {
  it("defaults to K80 geometry (48 cols at 1x)", () => {
    expect(getReceiptColumns()).toBe(48);
  });

  it("narrows K58 rolls and shrinks with bigger fonts", () => {
    expect(getReceiptColumns({ paperSize: "k58" })).toBe(32);
    expect(getReceiptColumns({ paperSize: "k80", fontSize: 24 })).toBe(24);
  });
});

describe("qz error reporting", () => {
  it("stores and clears the last error", () => {
    setLastQzError("QZ_OFFLINE: boom");
    expect(getLastQzError()).toBe("QZ_OFFLINE: boom");
    setLastQzError(null);
    expect(getLastQzError()).toBeNull();
  });

  it("maps known codes to friendly messages, passes through unknown ones", () => {
    expect(describeQzError(null)).toContain("QZ Tray");
    expect(describeQzError("QZ_OFFLINE: x")).toContain("chưa chạy");
    expect(describeQzError("QZ_NO_PRINTER: x")).toContain("máy in");
    expect(describeQzError("weird raw error")).toBe("weird raw error");
  });
});

describe("stripDiacritics", () => {
  it("transliterates Vietnamese for ESC/POS codepages", () => {
    expect(stripDiacritics("Đồng hồ")).toBe("Dong ho");
  });
});

describe("buildEscPosBytes", () => {
  it("starts with ESC @ init and ends with partial cut", () => {
    const bytes = buildEscPosBytes({ title: "SHOP", lines: [{ text: "hello" }] });
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);
    expect(Array.from(bytes.slice(-4))).toEqual([0x1d, 0x56, 0x42, 0x00]);
  });

  it("round-trips through bytesToHex for the QZ raw-hex payload", () => {
    const hex = bytesToHex(buildEscPosBytes({ title: "A", lines: [] }));
    expect(hex.startsWith("1b40")).toBe(true);
    expect(hex.endsWith("1d564200")).toBe(true);
  });
});

describe("buildBarcodeLabelBytes", () => {
  it("encodes a CODE128 label with cut command", () => {
    const bytes = buildBarcodeLabelBytes({ name: "Item", code: "ABC123" });
    expect(bytes[0]).toBe(0x1b);
    expect(Array.from(bytes.slice(-3))).toEqual([0x56, 0x42, 0x00]);
  });
});

describe("buildBarcodeLabelsHtml pagination", () => {
  const labels = Array.from({ length: 20 }, (_, i) => ({
    name: `Item ${i + 1}`,
    code: `SKU${i + 1}`,
    price: 10000,
  }));

  const countOccurrences = (html: string, needle: string): number =>
    html.split(needle).length - 1;

  it("chunks t46 20 labels col=2 with price into whole-label pages (6/6/6/2)", () => {
    // t46 + price estimate: 3 rows x 2 cols = 6 per page -> 4 pages
    const html = buildBarcodeLabelsHtml(labels, { paperSize: "t46", columns: 2, showPrice: true });
    expect(countOccurrences(html, '<div class="page">')).toBe(4);
    expect(countOccurrences(html, '<div class="label">')).toBe(20);
    // last page is short (2 labels), not padded with clones
    const lastPage = html.slice(html.lastIndexOf('<div class="page">'));
    expect(countOccurrences(lastPage, '<div class="label">')).toBe(2);
  });

  it("fits more rows per page when price is hidden (labels are shorter)", () => {
    const withPrice = buildBarcodeLabelsHtml(labels, { paperSize: "t46", columns: 2, showPrice: true });
    const withoutPrice = buildBarcodeLabelsHtml(labels, { paperSize: "t46", columns: 2, showPrice: false });
    // without price: 4 rows x 2 cols = 8 per page -> 3 pages
    expect(countOccurrences(withPrice, '<div class="page">')).toBe(4);
    expect(countOccurrences(withoutPrice, '<div class="page">')).toBe(3);
    expect(countOccurrences(withoutPrice, '<div class="label">')).toBe(20);
  });

  it("keeps rolls continuous (single page block, no forced breaks)", () => {
    const html = buildBarcodeLabelsHtml(labels, { paperSize: "k80", columns: 1 });
    expect(countOccurrences(html, '<div class="page">')).toBe(1);
    expect(countOccurrences(html, '<div class="label">')).toBe(20);
  });

  it("honours an explicit rowsPerPage override", () => {
    const html = buildBarcodeLabelsHtml(labels, { paperSize: "t46", columns: 2, rowsPerPage: 2 });
    // 2 rows x 2 cols = 4 per page -> 5 pages
    expect(countOccurrences(html, '<div class="page">')).toBe(5);
  });

  it("renders price only when showPrice is set", () => {
    const withPrice = buildBarcodeLabelsHtml([labels[0]], { paperSize: "t46", showPrice: true });
    const withoutPrice = buildBarcodeLabelsHtml([labels[0]], { paperSize: "t46", showPrice: false });
    expect(withPrice).toContain("10.000đ");
    expect(withoutPrice).not.toContain("10.000đ");
  });

  it("spaces labels with margins (not grid-gap) and caps barcode height", () => {
    const html = buildBarcodeLabelsHtml([labels[0]], { paperSize: "t46", columns: 2 });
    // older QZ renderers ignore grid-gap: margins keep the inter-label spacing
    expect(html).toContain("gap:0");
    expect(html).toContain("margin:1mm");
    // short-code SVGs must not stretch to full column width (height blowup)
    expect(html).toContain("width:auto !important");
    expect(html).toContain("max-height:12mm !important");
  });
});

describe("estimateRowsPerPage", () => {
  it("accounts for price display", async () => {
    const { estimateRowsPerPage } = await import("../barcode-label-layout");
    const withPrice = estimateRowsPerPage("t46", { showPrice: true });
    const withoutPrice = estimateRowsPerPage("t46", { showPrice: false });
    expect(withPrice).toBe(3);
    expect(withoutPrice).toBe(4);
    expect(withPrice).toBeLessThan(withoutPrice);
  });

  it("returns 0 (continuous) for rolls and >= 1 for fixed sheets", async () => {
    const { estimateRowsPerPage } = await import("../barcode-label-layout");
    expect(estimateRowsPerPage("k80")).toBe(0);
    expect(estimateRowsPerPage("k58")).toBe(0);
    expect(estimateRowsPerPage("a4", { showPrice: true })).toBeGreaterThanOrEqual(1);
    expect(estimateRowsPerPage("a5", { showPrice: true })).toBeGreaterThanOrEqual(1);
  });
});
