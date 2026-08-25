import { describe, it, expect } from "vitest";
import { buildCombos } from "../index";
import { productSchema } from "~/constants/schema/product";

describe("buildCombos (variant attribute matrix)", () => {
  it("returns no combinations without usable attributes", () => {
    expect(buildCombos([])).toEqual([]);
    expect(buildCombos([{ name: "", values: "Red,Blue" }])).toEqual([]);
    expect(buildCombos([{ name: "Color", values: " , ," }])).toEqual([]);
  });

  it("generates the cartesian product of trimmed values", () => {
    expect(
      buildCombos([
        { name: "Color", values: "Red, Blue" },
        { name: "Size", values: "S,M" },
      ]),
    ).toEqual([
      { Color: "Red", Size: "S" },
      { Color: "Red", Size: "M" },
      { Color: "Blue", Size: "S" },
      { Color: "Blue", Size: "M" },
    ]);
  });

  it("ignores attributes with an empty value list", () => {
    expect(buildCombos([{ name: "Color", values: "Red" }, { name: "Size", values: "" }])).toEqual([
      { Color: "Red" },
    ]);
  });
});

describe("productSchema with variant fields", () => {
  it("accepts a variable-product payload with variantAttributes/overrides", () => {
    const result = productSchema.safeParse({
      name: "Áo thun",
      quantity: 10,
      variantAttributes: [{ name: "Color", values: "Red, Blue" }],
      variantOverrides: [{ quantity: 4, salePrice: "120000" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.variantAttributes).toEqual([{ name: "Color", values: "Red, Blue" }]);
    }
  });

  it("rejects a missing required name so the UI can show the input error", () => {
    const result = productSchema.safeParse({ name: "", variantAttributes: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect((result.error as any).flatten().fieldErrors.name?.length).toBeGreaterThan(0);
    }
  });

  it("keeps variant fields optional for simple products", () => {
    expect(productSchema.safeParse({ name: "Cola" }).success).toBe(true);
  });
});
