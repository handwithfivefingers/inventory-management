import { describe, expect, it } from "vitest";
import { serializeProductVariant } from "../product-payload";

describe("serializeProductVariant", () => {
  it("keeps barcode prices in their API fields and removes retired salePrice fields", () => {
    expect(
      serializeProductVariant({
        quantity: "1",
        salePrice: "0",
        isNegative: false,
        barcodes: [
          {
            barcode: "893000000001",
            unitId: 2,
            conversionRate: 1,
            costPrice: "10000",
            retailPrice: "15000",
            wholesalePrice: 0,
            salePrice: "0",
            VAT: 0,
          },
        ],
      }),
    ).toEqual({
      quantity: "1",
      isNegative: false,
      barcodes: [
        {
          barcode: "893000000001",
          unitId: 2,
          conversionRate: 1,
          costPrice: "10000",
          retailPrice: "15000",
          wholesalePrice: 0,
        },
      ],
    });
  });
});
