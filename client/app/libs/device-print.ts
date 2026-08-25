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

/** Build raw ESC/POS bytes for the receipt */
export const buildEscPosBytes = (receipt: IReceipt): Uint8Array => {
  const chunks: Uint8Array[] = [
    new Uint8Array([ESC, 0x40]), // ESC @ — initialize printer
  ];

  // Title: centered + double size
  chunks.push(new Uint8Array([ESC, 0x61, 0x01])); // ESC a n — center
  chunks.push(new Uint8Array([GS, 0x21, 0x11])); // GS ! n — double width/height
  chunks.push(new Uint8Array([ESC, 0x45, 0x01])); // ESC E n — bold on
  chunks.push(utf8(receipt.title));
  chunks.push(new Uint8Array([10]));
  chunks.push(new Uint8Array([ESC, 0x45, 0x00])); // bold off
  chunks.push(new Uint8Array([GS, 0x21, 0x00])); // normal size

  if (receipt.subtitle) {
    chunks.push(utf8(receipt.subtitle));
    chunks.push(new Uint8Array([10]));
  }
  chunks.push(new Uint8Array([10]));

  // Body lines
  for (const line of receipt.lines) {
    chunks.push(new Uint8Array([ESC, 0x61, line.center ? 0x01 : 0x00]));
    if (line.bold) chunks.push(new Uint8Array([ESC, 0x45, 0x01]));
    if (line.large) chunks.push(new Uint8Array([GS, 0x21, 0x11]));
    chunks.push(utf8(line.text));
    chunks.push(new Uint8Array([10]));
    if (line.large) chunks.push(new Uint8Array([GS, 0x21, 0x00]));
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
 * Resolves `true` on success; `false` when WebUSB is unavailable, the user
 * cancels, or printing fails (caller should fall back to window.print()).
 */
export const printReceiptToDevice = async (receipt: IReceipt): Promise<boolean> => {
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
    await device.transferOut(target.endpointNumber, buildEscPosBytes(receipt));
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
