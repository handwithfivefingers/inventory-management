import { describe, expect, it } from "vitest";
import {
  buildUnifiedFormParams,
  isAdminSearchItem,
  isPosSearchItem,
  isUnifiedSearchResponse,
  mapAdminItemToRow,
  mapPosItemToRow,
  parseUnifiedSearchResponse,
} from "../product-search";

const posItem = {
  variant_id: 11,
  product_id: 5,
  product_name: "Ao thun",
  variant_name: "ABC-123",
  display_name: "Ao thun - ABC-123",
  sku: "ABC-123",
  barcode: "BARCODE-001",
  price: 150,
  costPrice: 90,
  stock_quantity: 8,
  VAT: 8,
  imageUrl: "/variant.png",
  isNegative: true,
  sold: 12,
};

const adminItem = {
  product_id: 5,
  product_name: "Ao thun",
  category_id: 2,
  is_active: true,
  total_variants: 3,
  total_stock: 25,
};

describe("unified product search adapters", () => {
  describe("guards", () => {
    it("identifies POS variant-level items", () => {
      expect(isPosSearchItem(posItem)).toBe(true);
      expect(isPosSearchItem(adminItem)).toBe(false);
      expect(isPosSearchItem(null)).toBe(false);
    });

    it("identifies ADMIN product-level items", () => {
      expect(isAdminSearchItem(adminItem)).toBe(true);
      expect(isAdminSearchItem(posItem)).toBe(false);
      expect(isAdminSearchItem("x")).toBe(false);
    });

    it("validates exact and fallback response envelopes", () => {
      expect(isUnifiedSearchResponse({ exact_match: true, context: "POS", data: posItem })).toBe(true);
      expect(
        isUnifiedSearchResponse({ exact_match: false, context: "ADMIN", data: [adminItem], total_count: 1 }),
      ).toBe(true);
      expect(isUnifiedSearchResponse({ exact_match: true, context: "POS", data: adminItem })).toBe(false);
      expect(isUnifiedSearchResponse(null)).toBe(false);
      expect(isUnifiedSearchResponse({})).toBe(false);
    });
  });

  describe("mapPosItemToRow", () => {
    it("carries the actionable variant so pages can add without a picker", () => {
      const row = mapPosItemToRow(posItem);
      expect(row.id).toBe(5);
      expect(row.name).toBe("Ao thun - ABC-123");
      expect(row.skuCode).toBe("ABC-123");
      expect(row.quantity).toBe(8);
      expect(row.unifiedVariant).toMatchObject({ id: 11, productId: 5, salePrice: 150, costPrice: 90, VAT: 8, imageUrl: "/variant.png", isNegative: true, sold: 12 });
      expect(row.variants).toHaveLength(1);
    });

    it("tolerates a null barcode", () => {
      const row = mapPosItemToRow({ ...posItem, barcode: null });
      expect(row.code).toBe("");
      expect(row.unifiedVariant?.code).toBeNull();
    });
  });

  describe("mapAdminItemToRow", () => {
    it("exposes aggregates for the backoffice table", () => {
      const row = mapAdminItemToRow(adminItem);
      expect(row.id).toBe(5);
      expect(row.name).toBe("Ao thun");
      expect(row.quantity).toBe(25);
      expect(row.variantCount).toBe(3);
      expect(row.unifiedAdmin).toBe(true);
    });
  });

  describe("parseUnifiedSearchResponse", () => {
    it("surfaces the exact item for auto-add / highlight flows", () => {
      const parsed = parseUnifiedSearchResponse({ exact_match: true, context: "POS", data: posItem });
      expect(parsed.exactItem).toMatchObject({ variant_id: 11, sku: "ABC-123" });
      expect(parsed.rows).toHaveLength(0);
      expect(parsed.totalCount).toBe(1);
    });

    it("maps mixed fallback rows and keeps total_count for pagination", () => {
      const parsed = parseUnifiedSearchResponse({
        exact_match: false,
        context: "ADMIN",
        data: [adminItem],
        total_count: 42,
        page: 2,
        limit: 10,
      });
      expect(parsed.rows).toHaveLength(1);
      expect(parsed.rows[0].id).toBe(5);
      expect(parsed.totalCount).toBe(42);
    });

    it("maps POS fallback rows with their variants", () => {
      const parsed = parseUnifiedSearchResponse({
        exact_match: false,
        context: "POS",
        data: [posItem],
        total_count: 1,
        page: 1,
        limit: 20,
      });
      expect(parsed.rows[0].unifiedVariant).toMatchObject({ id: 11 });
    });

    it("degrades unknown payloads to an empty result", () => {
      expect(parseUnifiedSearchResponse(undefined)).toEqual({ rows: [], totalCount: 0 });
      expect(parseUnifiedSearchResponse({ data: [] })).toEqual({ rows: [], totalCount: 0 });
    });
  });

  describe("buildUnifiedFormParams", () => {
    it("emits string-only params and omits blanks", () => {
      expect(
        buildUnifiedFormParams({ query: " abc ", context: "POS", warehouseId: 7, page: 1, limit: 20 }),
      ).toEqual({ context: "POS", query: " abc ", warehouse_id: "7", page: "1", limit: "20" });
      expect(buildUnifiedFormParams({ context: "ADMIN", query: "   " })).toEqual({ context: "ADMIN" });
      expect(buildUnifiedFormParams({ context: "ADMIN" })).toEqual({ context: "ADMIN" });
    });
  });
});
