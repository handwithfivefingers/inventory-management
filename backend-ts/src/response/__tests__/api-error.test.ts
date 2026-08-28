import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Sentry so handleErrors never attempts a real network call.
vi.mock("@sentry/node", () => ({
  captureException: vi.fn(),
}));

import { captureException } from "@sentry/node";
import response, { ApiError } from "#/response/index";

describe("ApiError", () => {
  it("uses a default 400 status and the provided message", () => {
    const err = new ApiError(new Error("boom") as any);
    expect(err.status).toBe(400);
    expect(err.message).toBe("boom");
  });

  it("is an Error instance and preserves the original error name", () => {
    const err = new ApiError(Object.assign(new Error("x"), { name: "CustomErr" }) as any);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("CustomErr");
  });

  it("honours an explicit status code", () => {
    const err = new ApiError(new Error("nope") as any, 404);
    expect(err.status).toBe(404);
  });

  it("applies an explicit status alongside Sequelize details", () => {
    const sequelizeErr = Object.assign(new Error("dup"), {
      name: "SequelizeUniqueConstraintError",
      code: "ER_DUP_ENTRY",
      sqlMessage: "Duplicate entry",
      fields: { email: "a@b.com" },
    });
    const err = new ApiError(sequelizeErr as any, 409);
    expect(err.status).toBe(409);
    expect(err.code).toBe("ER_DUP_ENTRY");
    expect(err.fields).toEqual({ email: "a@b.com" });
  });

  it("extracts Sequelize error details into code/fields/sqlMessage", () => {
    const sequelizeErr = Object.assign(new Error("dup"), {
      name: "SequelizeUniqueConstraintError",
      code: "ER_DUP_ENTRY",
      sqlMessage: "Duplicate entry",
      fields: { email: "a@b.com" },
    });
    const err = new ApiError(sequelizeErr as any);
    expect(err.code).toBe("ER_DUP_ENTRY");
    expect(err.fields).toEqual({ email: "a@b.com" });
    expect(err.message).toBe("Duplicate entry");
  });

  it("leaves code/fields undefined for non-Sequelize errors", () => {
    const err = new ApiError(new Error("plain") as any);
    expect(err.code).toBeUndefined();
    expect(err.fields).toBeUndefined();
    expect(err.message).toBe("plain");
  });

  it("does not treat a malformed Sequelize error (no sqlMessage) as fatal", () => {
    const sequelizeErr = Object.assign(new Error("boom"), {
      name: "SequelizeConnectionError",
      code: "ER_ACCESS_DENIED",
    });
    const err = new ApiError(sequelizeErr as any);
    expect(err.code).toBe("ER_ACCESS_DENIED");
    expect(err.fields).toBeUndefined();
  });
});

describe("handleErrors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures the error via Sentry and responds with 400 + structured json", () => {
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) } as any;
    const error = new Error("fail");

    response.handleErrors({} as Request, res, error);

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(error);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: "fail", status: 400 });
  });

  it("captures the error via Sentry even when the error has no message", () => {
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) } as any;
    response.handleErrors({} as Request, res, {} as Error);
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalledWith({ error: "Internal Server Error", status: 400 });
  });

  it("respects ApiError status and serializes via toJSON", () => {
    const apiErr = new ApiError("not found", 404);

    // legacy signature (req, res, err)
    const jsonLegacy = vi.fn();
    const resLegacy = { status: vi.fn(() => ({ json: jsonLegacy })) } as any;
    response.handleErrors({} as Request, resLegacy, apiErr as unknown as Error);
    expect(resLegacy.status).toHaveBeenCalledWith(404);
    expect(jsonLegacy).toHaveBeenCalledWith({ error: "not found", status: 404 });

    // standard Express signature (err, req, res, next)
    const json2 = vi.fn();
    const res2 = { status: vi.fn(() => ({ json: json2 })) } as any;
    response.handleErrors(apiErr, {} as Request, res2, (() => {}) as any);
    expect(json2).toHaveBeenCalledWith({ error: "not found", status: 404 });
  });

  it("returns generic message for 500 server errors", () => {
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) } as any;
    const err = new ApiError("leaked stack", 500);

    response.handleErrors(err, {} as Request, res, (() => {}) as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Internal Server Error", status: 500 });
  });
});
