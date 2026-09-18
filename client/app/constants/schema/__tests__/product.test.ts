import { describe, expect, it } from "vitest";
import { productSchema } from "../product";

const variant = {
  options: {},
  quantity: 0,
  barcodes: [
    {
      barcode: "893000000001",
      unitId: 1,
      conversionRate: 1,
      costPrice: 0,
      retailPrice: 0,
      wholesalePrice: 0,
      isBaseUnit: true,
    },
  ],
};

describe("productSchema", () => {
  it("allows a new product with zero opening stock", () => {
    expect(productSchema.safeParse({ name: "Sản phẩm mới", quantity: 0, variants: [variant] }).success).toBe(true);
  });

  it("still requires exactly one base-unit row per variant", () => {
    expect(
      productSchema.safeParse({
        name: "Sản phẩm mới",
        variants: [{ ...variant, barcodes: [...variant.barcodes, { ...variant.barcodes[0], barcode: "893000000002" }] }],
      }).success,
    ).toBe(false);
  });
});
