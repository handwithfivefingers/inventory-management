import { describe, it, expect } from "vitest";
import {
  getBarcodeRetailPrice,
  getEffectiveProductPrice,
  getVariantCostPrice,
  getVariantRetailPrice,
  getProductPriceLabel,
  getProductPriceValues,
  mapProductListRow,
} from "~/libs/product-price";
import type { IProduct } from "~/types/product";

const product = (overrides: Partial<IProduct> = {}) =>
  ({
    id: 1,
    name: "Ao thun",
    code: "P1",
    skuCode: "SKU1",
    ...overrides,
  }) as IProduct;

describe("getEffectiveProductPrice", () => {
  it("prefers salePrice over regularPrice and costPrice", () => {
    expect(getEffectiveProductPrice({ salePrice: 100, regularPrice: 200, costPrice: 300 } as any)).toBe(100);
    expect(getEffectiveProductPrice({ regularPrice: 200, costPrice: 300 } as any)).toBe(200);
    expect(getEffectiveProductPrice({ costPrice: 300 } as any)).toBe(300);
  });

  it("skips zero, negative and non-numeric prices", () => {
    expect(getEffectiveProductPrice({ salePrice: 0, regularPrice: -5, costPrice: "abc" } as any)).toBe(0);
    expect(getEffectiveProductPrice({ salePrice: "150" } as any)).toBe(150);
    expect(getEffectiveProductPrice({} as any)).toBe(0);
  });
});

describe("barcode-backed variant prices", () => {
  const baseBarcode = {
    barcode: "893000000001",
    unitId: 1,
    conversionRate: 1,
    costPrice: 70,
    retailPrice: 120,
    wholesalePrice: 90,
  };

  it("uses the base barcode prices instead of obsolete variant fields", () => {
    const variant = { salePrice: 999, costPrice: 888, barcodes: [baseBarcode] } as any;
    expect(getVariantRetailPrice(variant)).toBe(120);
    expect(getVariantCostPrice(variant)).toBe(70);
    expect(getEffectiveProductPrice(variant)).toBe(120);
  });

  it("uses an active promotion and ignores expired promotions", () => {
    expect(
      getBarcodeRetailPrice({
        ...baseBarcode,
        promoPrice: 100,
        promoStartAt: new Date(Date.now() - 1_000).toISOString(),
        promoEndAt: new Date(Date.now() + 1_000).toISOString(),
      }),
    ).toBe(100);
    expect(
      getBarcodeRetailPrice({ ...baseBarcode, promoPrice: 100, promoEndAt: new Date(Date.now() - 1_000).toISOString() }),
    ).toBe(120);
  });
});

describe("getProductPriceValues", () => {
  it("uses the explicit price range when present", () => {
    expect(getProductPriceValues(product({ priceFrom: 10, priceTo: 20 }))).toEqual([10, 20]);
    expect(getProductPriceValues(product({ priceFrom: 10 }))).toEqual([10, 10]);
  });

  it("maps active variants and filters out inactive ones", () => {
    const values = getProductPriceValues(
      product({
        variants: [
          { salePrice: 100, isActive: true },
          { salePrice: 200, isActive: false },
          { salePrice: 300 },
        ] as any,
      }),
    );
    expect(values).toEqual([100, 300]);
  });

  it("falls back to the product price when there are no variants", () => {
    expect(getProductPriceValues(product({ salePrice: 99, variants: [] as any }))).toEqual([99]);
  });
});

describe("getProductPriceLabel", () => {
  it("formats a single price without a range", () => {
    const label = getProductPriceLabel(product({ salePrice: 100, variants: [] as any }));
    expect(label).not.toContain("-");
    expect(label.length).toBeGreaterThan(0);
  });

  it("formats a range when variant prices differ", () => {
    const label = getProductPriceLabel(
      product({ variants: [{ salePrice: 100 }, { salePrice: 200 }] as any }),
    );
    expect(label).toContain("Range");
    expect(label).toContain("-");
  });
});

describe("mapProductListRow", () => {
  it("lifts the first active variant display fields onto the row", () => {
    const row = mapProductListRow(
      product({
        salePrice: 50,
        variants: [
          { code: "V1", skuCode: "SKU-V1", salePrice: 100, regularPrice: 120, costPrice: 80, isActive: true },
          { code: "V2", skuCode: "SKU-V2", salePrice: 200, isActive: false },
        ] as any,
      }),
    );

    expect(row.code).toBe("V1");
    expect(row.skuCode).toBe("SKU-V1");
    expect(row.salePrice).toBe(100);
    expect(row.regularPrice).toBe(120);
    expect(row.costPrice).toBe(80);
    expect(row.priceFrom).toBe(100);
    expect(row.priceTo).toBe(100);
    expect(row.quantity).toBe(0);
  });

  it("keeps product fields and computes min/max across variants", () => {
    const row = mapProductListRow(
      product({
        code: "P1",
        quantity: 7,
        variants: [{ salePrice: 100 }, { salePrice: 300 }] as any,
      }),
    );

    expect(row.code).toBe("P1");
    expect(row.quantity).toBe(7);
    expect(row.priceFrom).toBe(100);
    expect(row.priceTo).toBe(300);
  });

  it("handles products without variants", () => {
    const row = mapProductListRow(product({ salePrice: 42 }));
    expect(row.salePrice).toBe(42);
    expect(row.priceFrom).toBe(42);
    expect(row.priceTo).toBe(42);
  });
});
