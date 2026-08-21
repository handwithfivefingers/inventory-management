import { describe, it, expect } from "vitest";
import { getPagination } from "#/utils/pagination";

describe("getPagination", () => {
  it("applies sensible defaults when nothing is provided", () => {
    const result = getPagination({});
    expect(result).toEqual({
      limit: 10,
      offset: 0,
      vendorId: undefined,
      warehouseId: undefined,
    });
  });

  it("computes limit and offset from page/pageSize", () => {
    const result = getPagination({ page: 2, pageSize: 20 });
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(20);
  });

  it("coerces string page/pageSize to numbers", () => {
    const result = getPagination({ page: "3", pageSize: "25" });
    expect(result.limit).toBe(25);
    expect(result.offset).toBe(50);
  });

  it("passes vendorId and warehouseId through", () => {
    const result = getPagination({ vendorId: "v1", warehouseId: "w2" });
    expect(result.vendorId).toBe("v1");
    expect(result.warehouseId).toBe("w2");
  });

  it("treats page 1 as zero offset", () => {
    const result = getPagination({ page: 1, pageSize: 15 });
    expect(result.offset).toBe(0);
    expect(result.limit).toBe(15);
  });

  it("treats a numeric page 0 as zero offset", () => {
    const result = getPagination({ page: 0, pageSize: 20 });
    expect(result.offset).toBe(0);
    expect(result.limit).toBe(20);
  });

  it("supports large page numbers", () => {
    const result = getPagination({ page: 100, pageSize: 50 });
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(4950);
  });

  it("passes numeric vendorId and warehouseId through", () => {
    const result = getPagination({ vendorId: 7 as any, warehouseId: 12 as any });
    expect(result.vendorId).toBe(7);
    expect(result.warehouseId).toBe(12);
  });

  it("returns all four keys on the result", () => {
    const result = getPagination({});
    expect(Object.keys(result).sort()).toEqual([
      "limit",
      "offset",
      "vendorId",
      "warehouseId",
    ]);
  });
});
