import { describe, it, expect, beforeEach } from "vitest";
import {
  QZ_ENABLED,
  QZ_PRINTER_STORAGE_KEY,
  bytesToHex,
  describeQzError,
  ensureQzConnected,
  getLastQzError,
  isQzConnected,
  listQzPrinters,
  loadQzPrinterName,
  printHtml,
  printRawHex,
  resolveQzPrinterName,
  saveQzPrinterName,
  setLastQzError,
} from "~/libs/qz-print";

describe("qz-print error bookkeeping", () => {
  beforeEach(() => setLastQzError(null));

  it("round-trips the last error", () => {
    expect(getLastQzError()).toBeNull();
    setLastQzError("boom");
    expect(getLastQzError()).toBe("boom");
    setLastQzError(null);
    expect(getLastQzError()).toBeNull();
  });

  it("describes every known failure mode", () => {
    expect(describeQzError(null)).toContain("QZ Tray");
    expect(describeQzError("")).toContain("QZ Tray");
    expect(describeQzError("QZ_DISABLED: x")).toContain("đang tắt");
    expect(describeQzError("QZ_OFFLINE: x")).toContain("chưa chạy");
    expect(describeQzError("QZ_NO_PRINTER: x")).toContain("máy in");
    expect(describeQzError("sign HTTP 401: nope")).toContain("Đăng nhập lại");
    expect(describeQzError("sign HTTP 500: nope")).toContain("chữ ký");
    expect(describeQzError("QZ_SIGNING broken")).toContain("chữ ký");
    expect(describeQzError("totally-unknown")).toBe("totally-unknown");
  });
});

describe("qz-print printer-name storage", () => {
  beforeEach(() => localStorage.clear());

  it("saves and loads the printer name", () => {
    expect(loadQzPrinterName()).toBeNull();
    saveQzPrinterName("XP-80C");
    expect(loadQzPrinterName()).toBe("XP-80C");
    expect(localStorage.getItem(QZ_PRINTER_STORAGE_KEY)).toBe("XP-80C");
  });

  it("removes the key on null/empty names", () => {
    saveQzPrinterName("XP-80C");
    saveQzPrinterName(null);
    expect(loadQzPrinterName()).toBeNull();
    saveQzPrinterName("XP-80C");
    saveQzPrinterName("");
    expect(loadQzPrinterName()).toBeNull();
  });
});

describe("bytesToHex", () => {
  it("encodes bytes as lowercase hex", () => {
    expect(bytesToHex(new Uint8Array([0x1b, 0x40, 0x0a]))).toBe("1b400a");
    expect(bytesToHex(new Uint8Array([]))).toBe("");
    expect(bytesToHex(new Uint8Array([0, 255]))).toBe("00ff");
  });
});

describe("qz-print while disabled", () => {
  it("is flagged off", () => {
    expect(QZ_ENABLED).toBe(false);
  });

  it("reports disconnected without throwing", async () => {
    await expect(isQzConnected()).resolves.toBe(false);
  });

  it("ensureQzConnected rejects with QZ_DISABLED", async () => {
    await expect(ensureQzConnected()).rejects.toThrow("QZ_DISABLED");
  });

  it("listQzPrinters rejects while disabled", async () => {
    await expect(listQzPrinters()).rejects.toThrow("QZ_DISABLED");
  });

  it("resolveQzPrinterName rejects while disabled", async () => {
    await expect(resolveQzPrinterName()).rejects.toThrow("QZ_DISABLED");
    await expect(resolveQzPrinterName("XP-80C")).rejects.toThrow("QZ_DISABLED");
  });

  it("printHtml is a no-op for empty html", async () => {
    await expect(printHtml("")).resolves.toBeUndefined();
  });

  it("printHtml rejects while disabled", async () => {
    await expect(printHtml("<b>hi</b>")).rejects.toThrow("QZ_DISABLED");
  });

  it("printRawHex is a no-op for empty payloads", async () => {
    await expect(printRawHex([])).resolves.toBeUndefined();
  });

  it("printRawHex rejects while disabled", async () => {
    await expect(printRawHex(["1b40"])).rejects.toThrow("QZ_DISABLED");
  });
});
