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
    },
  ],
};

describe("productSchema", () => {
  it("allows a new product with zero opening stock", () => {
    expect(productSchema.safeParse({ name: "Sản phẩm mới", quantity: 0, variants: [variant] }).success).toBe(true);
  });

  it("requires exactly one conversion-rate-one base-unit row per variant", () => {
    expect(
      productSchema.safeParse({
        name: "Sản phẩm mới",
        variants: [{ ...variant, barcodes: [...variant.barcodes, { ...variant.barcodes[0], barcode: "893000000002", unitId: 2 }] }],
      }).success,
    ).toBe(false);
  });

  it("accepts an existing base barcode at another index", () => {
    expect(
      productSchema.safeParse({
        name: "Sản phẩm mới",
        variants: [
          {
            ...variant,
            barcodes: [
              { ...variant.barcodes[0], conversionRate: 2 },
              { ...variant.barcodes[0], barcode: "893000000002", unitId: 2, conversionRate: 1 },
            ],
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("only allows integer conversion rates greater than one for additional barcodes", () => {
    for (const conversionRate of [1, 0, -1, 1.5]) {
      expect(
        productSchema.safeParse({
          name: "Sản phẩm mới",
          variants: [
            {
              ...variant,
              barcodes: [
                ...variant.barcodes,
                { ...variant.barcodes[0], barcode: `89300000000${conversionRate}`, unitId: 2, conversionRate },
              ],
            },
          ],
        }).success,
      ).toBe(false);
    }
  });

  it("allows a secondary barcode with a different unit and conversion rate greater than one", () => {
    expect(
      productSchema.safeParse({
        name: "Sản phẩm mới",
        variants: [
          {
            ...variant,
            barcodes: [...variant.barcodes, { ...variant.barcodes[0], barcode: "893000000002", unitId: 2, conversionRate: 12 }],
          },
        ],
      }).success,
    ).toBe(true);
  });
});
