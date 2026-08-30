import { describe, it, expect, vi } from "vitest";
import { vendorGuard } from "../vendorGuard";

const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("vendorGuard", () => {
  it("allows when vendorId equals allowed vendor", async () => {
    const req: any = { query: { vendorId: "1" }, user: { vendorIds: [1, 2] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows vendor alias ?vendor=", async () => {
    const req: any = { query: { vendor: "2" }, user: { vendorIds: [2] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("allows vendorId in body", async () => {
    const req: any = { query: {}, body: { vendorId: 1 }, user: { vendorIds: [1] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("rejects out-of-scope vendor", async () => {
    const req: any = { query: { vendorId: "99" }, user: { vendorIds: [1] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects when vendor param missing (mandatory)", async () => {
    const req: any = { query: {}, user: { vendorIds: [1] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rejects non-numeric vendor", async () => {
    const req: any = { query: { vendorId: "abc" }, user: { vendorIds: [1] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("allows platform admin (null scope)", async () => {
    const req: any = { query: {}, user: {} }; // no vendorIds -> getVendorScope returns null
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("denies empty scope (owns nothing)", async () => {
    const req: any = { query: { vendorId: "1" }, user: { vendorIds: [] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("supports locals.vendorIds fallback", async () => {
    const req: any = { query: { vendorId: "1" }, locals: { vendorIds: [1] } };
    const res = makeRes();
    const next = vi.fn();
    await vendorGuard(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
