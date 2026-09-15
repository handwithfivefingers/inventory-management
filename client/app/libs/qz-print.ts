/**
 * QZ Tray transport for thermal ESC/POS printing.
 *
 * TEMPORARILY DISABLED — browser print (`window.print()`) is used instead.
 * To re-enable: set `QZ_ENABLED = true` below and restore the QZ UI
 * (see `QzPrinterSelect`, `BarcodePrintModal`, invoice/order detail pages).
 *
 * QZ Tray runs as a local desktop agent (Win/Mac/Linux) and exposes the OS
 * printers over a localhost websocket. The browser page talks to it via the
 * `qz-tray` JS library — no WebUSB permission picker, no USB class filter,
 * and any OS-installed / network printer works through its normal driver.
 *
 * Signed mode: every API call is RSA-SHA512 signed by `/api/qz-sign`
 * (private key server-side in `QZ_PRIVATE_KEY`) and verified by QZ Tray
 * against the trusted certificate (`public/qz-cert.crt`, added once in
 * QZ Tray's Site Manager). Unsigned calls are rejected by QZ Tray.
 */

/** Master kill-switch for QZ Tray. Keep `false` while browser print is the default. */
export const QZ_ENABLED = false;

export const QZ_PRINTER_STORAGE_KEY = "qz-printer-name";

type QzApi = any;

let qzModulePromise: Promise<QzApi> | null = null;
let connectPromise: Promise<QzApi> | null = null;
let lastQzError: string | null = null;
let qzSecurityConfigured = false;

/** Last QZ failure reason (for toasts); cleared on next success. */
export const getLastQzError = (): string | null => lastQzError;

export const setLastQzError = (message: string | null): void => {
  lastQzError = message;
};

/** Friendly Vietnamese message for the common QZ failure modes. */
export const describeQzError = (raw: string | null): string => {
  if (!raw) return "Không kết nối được QZ Tray.";
  if (raw.startsWith("QZ_DISABLED")) return "In qua QZ Tray đang tắt. Dùng In qua trình duyệt.";
  if (raw.startsWith("QZ_OFFLINE")) return "QZ Tray chưa chạy trên máy này. Hãy mở QZ Tray rồi thử lại.";
  if (raw.startsWith("QZ_NO_PRINTER"))
    return "QZ Tray không tìm thấy máy in. Kiểm tra máy in đã cài trong hệ điều hành.";
  if (raw.includes("sign HTTP 401")) return "Phiên đăng nhập hết hạn. Đăng nhập lại rồi thử in.";
  if (raw.includes("sign HTTP") || raw.includes("QZ_SIGNING"))
    return "Lỗi ký QZ (chữ ký). Kiểm tra QZ_PRIVATE_KEY trên server.";
  return raw;
};

const isBrowser = (): boolean => typeof window !== "undefined";

/** Lazily import `qz-tray` on the client only (never during Remix SSR). */
const loadQz = async (): Promise<QzApi> => {
  if (!QZ_ENABLED) throw new Error("QZ_DISABLED: QZ Tray printing is disabled, use browser print");
  if (!isBrowser()) throw new Error("QZ unavailable (SSR)");
  if (!qzModulePromise) {
    qzModulePromise = import("qz-tray")
      .then((mod: any) => mod?.default ?? mod)
      .then((qz: QzApi) => {
        configureQzSecurity(qz);
        return qz;
      });
  }
  return qzModulePromise;
};

/**
 * Attach our certificate + server-side signing so QZ Tray accepts API calls
 * (unsigned calls are rejected with "Signature is missing").
 * Certificate is public (`/qz-cert.crt`); signing happens in `/api/qz-sign`
 * where the private key never leaves the server.
 */
const configureQzSecurity = (qz: QzApi): void => {
  if (qzSecurityConfigured) return;
  qzSecurityConfigured = true;
  try {
    qz.security.setSignatureAlgorithm("SHA512");
    qz.security.setCertificatePromise((resolve: (cert: string) => void, reject: (err: unknown) => void) => {
      fetch("/qz-cert.crt")
        .then(async (res) => {
          if (!res.ok) throw new Error(`certificate HTTP ${res.status}`);
          resolve(await res.text());
        })
        .catch(reject);
    });
    qz.security.setSignaturePromise(
      (toSign: string) => (resolve: (sig: string) => void, reject: (err: unknown) => void) => {
        fetch("/api/qz-sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toSign }),
        })
          .then(async (res) => {
            if (!res.ok) throw new Error(`sign HTTP ${res.status}: ${await res.text()}`);
            resolve(await res.text());
          })
          .catch(reject);
      },
    );
  } catch (error) {
    qzSecurityConfigured = false;
    console.warn("[qz-print] security setup failed", error);
  }
};

/** Saved QZ printer name (exact OS printer name shown in QZ Tray). */
export const loadQzPrinterName = (): string | null => {
  try {
    return localStorage.getItem(QZ_PRINTER_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const saveQzPrinterName = (name: string | null): void => {
  try {
    if (!name) localStorage.removeItem(QZ_PRINTER_STORAGE_KEY);
    else localStorage.setItem(QZ_PRINTER_STORAGE_KEY, name);
  } catch {
    /* storage unavailable */
  }
};

export const isQzConnected = async (): Promise<boolean> => {
  try {
    const qz = await loadQz();
    return qz?.websocket?.isActive?.() === true;
  } catch {
    return false;
  }
};

/**
 * Ensure the websocket to the local QZ Tray agent is open.
 * Throws `QZ_OFFLINE: ...` when QZ Tray isn't running so callers can fall
 * back to `window.print()`. Concurrent callers share one connect attempt;
 * a previously-resolved (now dead) connection is never reused.
 */
export const ensureQzConnected = async (): Promise<QzApi> => {
  const qz = await loadQz();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (qz?.websocket?.isActive?.()) {
        connectPromise = null;
        return qz;
      }
    } catch {
      /* fall through to connect */
    }
    if (!connectPromise) {
      connectPromise = qz.websocket
        .connect()
        .then(() => qz)
        .catch((error: unknown) => {
          connectPromise = null;
          const reason = error instanceof Error ? error.message : String(error);
          throw new Error(`QZ_OFFLINE: QZ Tray not reachable (${reason})`);
        });
    }
    try {
      const api = await connectPromise;
      if (api?.websocket?.isActive?.()) {
        connectPromise = null;
        return api;
      }
    } catch (error) {
      throw error; // already wrapped as QZ_OFFLINE above
    }
    // Resolved but socket dead (agent restarted) — drop and retry once.
    connectPromise = null;
  }
  throw new Error("QZ_OFFLINE: QZ Tray connection lost, retry the print");
};

/** All OS printer names visible to QZ Tray. Empty array on failure. */
export const listQzPrinters = async (): Promise<string[]> => {
  const qz = await ensureQzConnected();
  const found: unknown = await qz.printers.find();
  return Array.isArray(found) ? (found as string[]) : [];
};

/** Resolve which printer to use: saved name, else OS default. */
export const resolveQzPrinterName = async (override?: string | null): Promise<string> => {
  const qz = await ensureQzConnected();
  const saved = override ?? (isBrowser() ? loadQzPrinterName() : null);
  if (saved) {
    const matched: unknown = await qz.printers.find(saved).catch(() => null);
    if (typeof matched === "string" && matched) return matched;
    // Saved printer gone (renamed/unplugged) — fall through to default.
  }
  const fallback: unknown = await qz.printers.getDefault();
  if (typeof fallback === "string" && fallback) return fallback;
  throw new Error("QZ_NO_PRINTER: no default printer found in QZ Tray");
};

/** Raw ESC/POS bytes → lowercase hex for `{type:'raw', format:'command', flavor:'hex'}`. */
export const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/**
 * Send one HTML document to the printer via the OS driver
 * (`type:'pixel', format:'html'`) — NOT raw ESC/POS.
 *
 * Why pixel/html and not raw hex: `printRawHex` bypasses the driver and
 * pushes ESC/POS bytes straight to the port. On Linux (CUPS) with a
 * filtered queue (e.g. WanChen QR-488) the job is accepted
 * (`PrintRaw` → `sun.print.UnixPrintJob` → "Printing complete") but the
 * CUPS filter discards the bytes, so the printer does nothing. Pixel/HTML
 * renders through the normal driver, so filtered queues, Vietnamese
 * Unicode text, and barcode SVGs all work.
 */
export const printHtml = async (
  html: string,
  printerOverride?: string | null,
  opts?: { pageWidth?: number; copies?: number },
): Promise<void> => {
  if (!html) return;
  const qz = await ensureQzConnected();
  const printerName = await resolveQzPrinterName(printerOverride);
  const config = qz.configs.create(printerName, {
    units: "mm",
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    colorType: "blackwhite",
    scaleContent: false,
    density: 203,
    ...(opts?.copies && opts.copies > 1 ? { copies: opts.copies } : {}),
  });
  const data: any[] = [
    {
      type: "pixel",
      format: "html",
      flavor: "plain",
      data: html,
      ...(opts?.pageWidth ? { options: { pageWidth: opts.pageWidth } } : {}),
    },
  ];
  await qz.print(config, data);
};

/**
 * Send one or more raw hex payloads to the printer in a single QZ job.
 * Each payload becomes a `{type:'raw', format:'command', flavor:'hex'}` entry;
 * QZ spools them in order (labels already contain their own cut commands).
 *
 * @deprecated Thermal printing now uses `printHtml` (pixel/html through the
 * OS driver). Kept for diagnostics/fallback only — on Linux CUPS filtered
 * queues raw jobs are accepted but print nothing.
 */
export const printRawHex = async (payloads: string[], printerOverride?: string | null): Promise<void> => {
  if (!payloads.length) return;
  const qz = await ensureQzConnected();
  const printerName = await resolveQzPrinterName(printerOverride);
  const config = qz.configs.create(printerName);
  const data = payloads.map((hex) => ({
    type: "raw",
    format: "command",
    flavor: "hex",
    data: hex,
  }));
  await qz.print(config, data);
};
