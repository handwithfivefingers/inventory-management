export interface OrderLineLike {
  id: number | string;
  quantity: number | string;
  invoicedQty?: number | string | null;
}

export interface InvoiceLineSelection {
  order_detail_id: number;
  quantity: number;
}

/** Remaining qty of one order line (compute realtime, never stored). */
export const lineRemaining = (line: OrderLineLike): number =>
  Math.max(Number(line.quantity || 0) - Number(line.invoicedQty ?? 0), 0);

/** Clamp modal qty input: integer within [0, remaining]. */
export const clampLineQty = (qty: number, remaining: number): number =>
  Math.max(0, Math.min(Math.floor(qty || 0), Math.max(remaining, 0)));

/**
 * Derive FULL vs PARTIAL without asking the operator:
 * FULL only when every line with remaining qty is selected at full remainder.
 */
export const deriveInvoiceType = (
  lines: OrderLineLike[],
  selected: InvoiceLineSelection[]
): "FULL" | "PARTIAL" | null => {
  if (selected.length === 0) return null;
  const coversAll = lines
    .filter((d) => lineRemaining(d) > 0)
    .every((d) => {
      const sel = selected.find((l) => l.order_detail_id === Number(d.id));
      return !!sel && sel.quantity === lineRemaining(d);
    });
  return coversAll ? "FULL" : "PARTIAL";
};

/** Modal initial state: only lines with remaining qty, unchecked, qty = max. */
export const defaultSelection = (
  lines: OrderLineLike[]
): Record<number, { checked: boolean; qty: number }> => {
  const init: Record<number, { checked: boolean; qty: number }> = {};
  for (const d of lines) {
    const rem = lineRemaining(d);
    if (rem > 0) init[Number(d.id)] = { checked: false, qty: rem };
  }
  return init;
};
