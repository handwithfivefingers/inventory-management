import { describe, it, expect, vi, beforeEach } from "vitest";
import { endpointLogger } from "#/middleware/endpointLogger";

const makeRes = (statusCode: number) => {
  let finishCb: (() => void) | undefined;
  const res: any = {
    statusCode,
    on: (event: string, cb: () => void) => {
      if (event === "finish") finishCb = cb;
    },
  };
  return {
    res,
    triggerFinish: () => finishCb && finishCb(),
  };
};

describe("endpointLogger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls next() and does not throw", () => {
    const next = vi.fn();
    const { res } = makeRes(200);
    endpointLogger({ method: "GET", originalUrl: "/", socket: {} } as any, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("logs method, url, status and anonymous user on finish", () => {
    const next = vi.fn();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { res, triggerFinish } = makeRes(200);
    endpointLogger(
      { method: "GET", originalUrl: "/products", ip: "1.2.3.4", socket: {} } as any,
      res,
      next,
    );
    triggerFinish();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("GET");
    expect(output).toContain("/products");
    expect(output).toContain("200");
    expect(output).toContain("1.2.3.4");
    expect(output).toContain("anonymous");
  });

  it("falls back to '-' when the ip is missing", () => {
    const next = vi.fn();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { res, triggerFinish } = makeRes(200);
    endpointLogger(
      { method: "GET", originalUrl: "/x", socket: { remoteAddress: undefined } } as any,
      res,
      next,
    );
    triggerFinish();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("-");
  });

  it("includes the authenticated user id when available", () => {
    const next = vi.fn();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { res, triggerFinish } = makeRes(200);
    endpointLogger(
      { method: "POST", originalUrl: "/login", locals: { id: 7 }, socket: {} } as any,
      res,
      next,
    );
    triggerFinish();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("user=7");
  });

  it("colours 5xx responses red", () => {
    const next = vi.fn();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { res, triggerFinish } = makeRes(500);
    endpointLogger({ method: "GET", originalUrl: "/boom", socket: {} } as any, res, next);
    triggerFinish();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("\x1b[31m");
  });

  it("colours 4xx responses yellow", () => {
    const next = vi.fn();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { res, triggerFinish } = makeRes(404);
    endpointLogger({ method: "GET", originalUrl: "/missing", socket: {} } as any, res, next);
    triggerFinish();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("\x1b[33m");
  });

  it("colours 2xx responses green", () => {
    const next = vi.fn();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { res, triggerFinish } = makeRes(201);
    endpointLogger({ method: "GET", originalUrl: "/ok", socket: {} } as any, res, next);
    triggerFinish();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("\x1b[32m");
  });

  it("includes a duration and an ISO timestamp in the log line", () => {
    const next = vi.fn();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { res, triggerFinish } = makeRes(200);
    endpointLogger({ method: "GET", originalUrl: "/timing", socket: {} } as any, res, next);
    triggerFinish();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toMatch(/\d+\.\d{2}ms/); // duration
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}T.+Z/); // ISO timestamp
  });

  it("defaults the client ip to '-' when neither source is present", () => {
    const next = vi.fn();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { res, triggerFinish } = makeRes(200);
    endpointLogger(
      { method: "GET", originalUrl: "/x", socket: { remoteAddress: undefined } } as any,
      res,
      next,
    );
    triggerFinish();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain(" - ");
  });
});
