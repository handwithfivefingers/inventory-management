import { describe, it, expect } from "vitest";
import { getVendorScope, canAccessVendor, assertVendorAccess, vendorWhere } from "../tenant";
import { Op } from "sequelize";

describe("tenant utils", () => {
  describe("getVendorScope", () => {
    it("reads from user.vendorIds", () => {
      expect(getVendorScope({ user: { vendorIds: [1, 2] } } as any)).toEqual([1, 2]);
    });
    it("reads from locals.vendorIds fallback", () => {
      expect(getVendorScope({ locals: { vendorIds: [3] } } as any)).toEqual([3]);
    });
    it("filters non-finite ids", () => {
      expect(getVendorScope({ user: { vendorIds: [1, NaN, 2] } } as any)).toEqual([1, 2]);
    });
    it("returns null when no scope attached", () => {
      expect(getVendorScope({} as any)).toBeNull();
    });
    it("returns empty array for empty scope (deny all)", () => {
      expect(getVendorScope({ user: { vendorIds: [] } } as any)).toEqual([]);
    });
  });

  describe("canAccessVendor", () => {
    it("null scope always true (platform admin)", () => {
      expect(canAccessVendor(null, 99)).toBe(true);
    });
    it("empty scope denies", () => {
      expect(canAccessVendor([], 1)).toBe(false);
    });
    it("checks inclusion", () => {
      expect(canAccessVendor([1, 2], 2)).toBe(true);
      expect(canAccessVendor([1, 2], 3)).toBe(false);
    });
    it("handles string vendorId", () => {
      expect(canAccessVendor([1], "1" as any)).toBe(true);
    });
  });

  describe("assertVendorAccess", () => {
    it("throws 403 when out of scope", () => {
      expect(() => assertVendorAccess([1], 2)).toThrow();
      try {
        assertVendorAccess([1], 2);
      } catch (e: any) {
        expect(e.status).toBe(403);
      }
    });
    it("passes for null scope", () => {
      expect(() => assertVendorAccess(null, 999)).not.toThrow();
    });
  });

  describe("vendorWhere", () => {
    it("returns vendorId filter when requested inside scope", () => {
      expect(vendorWhere([1, 2], "1")).toEqual({ vendorId: 1 });
    });
    it("throws when requested outside scope", () => {
      expect(() => vendorWhere([1], "99")).toThrow();
    });
    it("returns {} for null scope without filter", () => {
      expect(vendorWhere(null)).toEqual({});
    });
    it("returns Op.in for scope without filter", () => {
      const where = vendorWhere([1, 2]) as any;
      expect(where.vendorId[Op.in]).toEqual([1, 2]);
    });
  });
});
