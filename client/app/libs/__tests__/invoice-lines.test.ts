import { describe, it, expect } from "vitest";
import { clampLineQty, defaultSelection, deriveInvoiceType, lineRemaining } from "../invoice-lines";
import { orderFormSchema } from "~/constants/schema/order";

describe("order channel (requirement 3)", () => {
  it("defaults channel to WHOLESALE", () => {
    expect(orderFormSchema.parse({}).channel).toBe("WHOLESALE");
  });
  it("accepts POS / WHOLESALE / ONLINE", () => {
    for (const channel of ["POS", "WHOLESALE", "ONLINE"]) {
      expect(orderFormSchema.safeParse({ channel }).success).toBe(true);
    }
  });
  it("rejects unknown channels", () => {
    expect(orderFormSchema.safeParse({ channel: "RETAIL" }).success).toBe(false);
  });
});

describe("lineRemaining (compute realtime, requirement 6)", () => {
  it("ordered - invoiced", () => {
    expect(lineRemaining({ id: 1, quantity: 5, invoicedQty: 2 })).toBe(3);
  });
  it("floors at 0 and defaults missing invoicedQty to 0", () => {
    expect(lineRemaining({ id: 1, quantity: 2, invoicedQty: 5 })).toBe(0);
    expect(lineRemaining({ id: 1, quantity: 4 })).toBe(4);
  });
});

describe("clampLineQty (modal max guard, requirement 8)", () => {
  it("caps at remaining and floors decimals/negatives", () => {
    expect(clampLineQty(10, 3)).toBe(3);
    expect(clampLineQty(2.9, 5)).toBe(2);
    expect(clampLineQty(-1, 5)).toBe(0);
    expect(clampLineQty(2, 5)).toBe(2);
  });
});

describe("deriveInvoiceType (auto FULL/PARTIAL, requirement 8)", () => {
  const lines = [
    { id: 11, quantity: 5, invoicedQty: 2 }, // remaining 3
    { id: 12, quantity: 8, invoicedQty: 0 }, // remaining 8
  ];
  it("FULL when all remainders fully covered", () => {
    expect(
      deriveInvoiceType(lines, [
        { order_detail_id: 11, quantity: 3 },
        { order_detail_id: 12, quantity: 8 },
      ])
    ).toBe("FULL");
  });
  it("PARTIAL on subset or reduced qty", () => {
    expect(deriveInvoiceType(lines, [{ order_detail_id: 11, quantity: 3 }])).toBe("PARTIAL");
    expect(
      deriveInvoiceType(lines, [
        { order_detail_id: 11, quantity: 2 },
        { order_detail_id: 12, quantity: 8 },
      ])
    ).toBe("PARTIAL");
  });
  it("null when nothing selected", () => {
    expect(deriveInvoiceType(lines, [])).toBe(null);
  });
});

describe("defaultSelection (disabled exhausted lines, requirement 8)", () => {
  it("only includes lines with remaining qty, qty preset to max", () => {
    const sel = defaultSelection([
      { id: 11, quantity: 5, invoicedQty: 5 },
      { id: 12, quantity: 8, invoicedQty: 2 },
    ]);
    expect(sel[11]).toBeUndefined();
    expect(sel[12]).toEqual({ checked: false, qty: 6 });
  });
});
