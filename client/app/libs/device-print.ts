/**
 * Direct thermal-receipt printing over WebUSB using ESC/POS commands.
 *
 * Works in Chromium browsers (Chrome/Edge) on HTTPS or localhost with a
 * USB receipt printer plugged in. The user picks the device once per session
 * (browser permission prompt); printing itself happens silently — no print
 * dialog. Falls back to `false` so callers can use window.print() instead.
 *
 * Note: most budget thermal printers don't render UTF-8 Vietnamese, so text
 * is transliterated (diacritics stripped) before sending.
 */

const ESC = 0x1b;
const GS = 0x1d;

/* Minimal WebUSB typings (avoids adding @types/w3c-web-usb) */
interface IUsbEndpointLike {
  type: string;
  direction: string;
  endpointNumber: number;
}
interface IUsbAlternateLike {
  endpoints: IUsbEndpointLike[];
}
interface IUsbInterfaceLike {
  interfaceNumber: number;
  alternates: IUsbAlternateLike[];
}
interface IUsbConfigurationLike {
  interfaces: IUsbInterfaceLike[];
}
interface IUsbDeviceLike {
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<unknown>;
  configuration: IUsbConfigurationLike | null;
}
interface IUsbLike {
  requestDevice(options: { filters: unknown[] }): Promise<IUsbDeviceLike>;
}

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
  paperSize?: "k58" | "k80";
  fontSize?: number; // px
  letterSpacing?: number; // px
  widthAdjust?: number; // mm
}

/* Thermal geometry: printable area and Font A metrics at 203 dpi */
const PAPER_PRINTABLE_MM: Record<string, number> = { k58: 48, k80: 72 };
const DOTS_PER_MM = 8;
const FONT_A_WIDTH_DOTS = 12;

/** Character magnification (1–7×) derived from the preview font size */
const charScale = (fontSizePx?: number): number =>
  Math.min(7, Math.max(1, Math.round((fontSizePx ?? 12) / 12)));

/**
 * Characters per line for the given config — accounts for the roll width,
 * the user's width adjustment AND the font magnification (bigger font ⇒ fewer
 * columns). Callers use this to pad/align two-column rows.
 */
export const getReceiptColumns = (config?: IPrinterConfig): number => {
  const cfg = { paperSize: "k80", fontSize: 12, widthAdjust: 0, ...(config ?? {}) };
  const printableMm = (PAPER_PRINTABLE_MM[cfg.paperSize] ?? PAPER_PRINTABLE_MM.k80) + (cfg.widthAdjust ?? 0);
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

/** Locate the first usable bulk-out endpoint (standard USB printer profile) */
const findOutputEndpoint = (device: IUsbDeviceLike) => {
  for (const iface of device.configuration?.interfaces ?? []) {
    for (const alternate of iface.alternates) {
      const endpoint = alternate.endpoints.find(
        (e) => e.type === "bulk" && e.direction === "out",
      );
      if (endpoint) {
        return { interfaceNumber: iface.interfaceNumber, endpointNumber: endpoint.endpointNumber };
      }
    }
  }
  return null;
};

/**
 * Send the receipt to a USB printer chosen by the user.
 * `config` carries the same settings as the on-screen receipt preview so the
 * printed output matches it. Resolves `true` on success; `false` when WebUSB
 * is unavailable, the user cancels, or printing fails (caller should fall
 * back to window.print()).
 */
export const printReceiptToDevice = async (receipt: IReceipt, config?: IPrinterConfig): Promise<boolean> => {
  const usb: IUsbLike | undefined =
    typeof navigator !== "undefined" ? (navigator as any).usb : undefined;
  if (!usb) {
    return false;
  }

  let device: IUsbDeviceLike;
  try {
    // Empty filter list: show every paired/pairable USB device
    device = await usb.requestDevice({ filters: [] });
  } catch {
    return false; // user cancelled or no device
  }

  try {
    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    const target = findOutputEndpoint(device);
    if (!target) {
      await device.close();
      return false;
    }
    await device.claimInterface(target.interfaceNumber);
    await device.transferOut(target.endpointNumber, buildEscPosBytes(receipt, config));
    await device.close();
    return true;
  } catch (error) {
    console.warn("Device print failed", error);
    try {
      await device.close();
    } catch {
      /* already closed */
    }
    return false;
  }
};
