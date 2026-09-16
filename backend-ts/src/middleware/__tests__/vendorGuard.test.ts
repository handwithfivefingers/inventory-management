import { describe, it, expect, vi } from "vitest";
import { vendorGuard } from "../vendorGuard";

const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("vendorGuard", () => {
  it("allows when x-vendor header equals allowed vendor", async () => {
    const req: any = { headers: { "x-vendor": "1" }, user: { vendorIds: [1, 2] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.activeVendorId).toBe(1);
  });

  it("prefers x-vendor header over legacy query", async () => {
    const req: any = {
      headers: { "x-vendor": "2" },
      query: { vendorId: "99" },
      user: { vendorIds: [2] },
    };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("falls back to legacy ?vendorId= when header is missing", async () => {
    const req: any = { headers: {}, query: { vendorId: "1" }, user: { vendorIds: [1] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("falls back to legacy ?vendor= alias", async () => {
    const req: any = { headers: {}, query: { vendor: "2" }, user: { vendorIds: [2] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("falls back to legacy body vendorId", async () => {
    const req: any = { headers: {}, query: {}, body: { vendorId: 1 }, user: { vendorIds: [1] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects out-of-scope vendor", async () => {
    const req: any = { headers: { "x-vendor": "99" }, user: { vendorIds: [1] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect((next.mock.calls[0][0] as Error & { status?: number }).status).toBe(401);
  });

  it("rejects when vendor identity is missing (mandatory)", async () => {
    const req: any = { headers: {}, query: {}, user: { vendorIds: [1] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("rejects non-numeric vendor", async () => {
    const req: any = { headers: { "x-vendor": "abc" }, user: { vendorIds: [1] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("allows platform admin (null scope)", async () => {
    const req: any = { headers: {}, query: {}, user: {} }; // no vendorIds -> getVendorScope returns null
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("denies empty scope (owns nothing)", async () => {
    const req: any = { headers: { "x-vendor": "1" }, user: { vendorIds: [] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("supports locals.vendorIds fallback", async () => {
    const req: any = { headers: { "x-vendor": "1" }, locals: { vendorIds: [1] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
