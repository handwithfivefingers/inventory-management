import { describe, it, expect, beforeEach, vi } from "vitest";

const getSessionValues = vi.fn();
const getSession = vi.fn();
const destroySession = vi.fn();

vi.mock("~/sessions", () => ({
  getSessionValues: (...args: unknown[]) => getSessionValues(...args),
  getSession: (...args: unknown[]) => getSession(...args),
  destroySession: (...args: unknown[]) => destroySession(...args),
}));

import { checkPermission, requireAuth, requireAdmin, requirePermission } from "../route-guard";

const makeRequest = (cookie: string) => ({
  headers: { get: (key: string) => (key === "Cookie" ? cookie : null) },
}) as unknown as Request;

describe("checkPermission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when a user is authenticated", async () => {
    getSessionValues.mockResolvedValue({ userId: "1" });
    expect(await checkPermission(makeRequest("session=abc"), "R")).toBe(true);
  });

  it("returns false when there is no user", async () => {
    getSessionValues.mockResolvedValue({ userId: undefined });
    expect(await checkPermission(makeRequest(""), "R")).toBe(false);
  });

  it("returns false when the session lookup throws", async () => {
    getSessionValues.mockRejectedValue(new Error("boom"));
    expect(await checkPermission(makeRequest(""), "R")).toBe(false);
  });
});

describe("requireAuth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the session when authenticated", async () => {
    getSessionValues.mockResolvedValue({ userId: "1", vendorId: "1", warehouseId: "1" });
    const session = await requireAuth(makeRequest("session=abc"));
    expect(session.userId).toBe("1");
  });

  it("redirects to login when unauthenticated", async () => {
    getSessionValues.mockResolvedValue({ userId: undefined });
    getSession.mockResolvedValue({});
    destroySession.mockResolvedValue("session=;");

    try {
      await requireAuth(makeRequest(""));
      throw new Error("expected a redirect");
    } catch (res) {
      expect((res as Response).status).toBe(302);
      expect((res as Response).headers.get("Location")).toBe("/auth/login");
    }
  });
});

describe("requireAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the session for an authenticated user", async () => {
    getSessionValues.mockResolvedValue({ userId: "1" });
    const session = await requireAdmin(makeRequest("session=abc"));
    expect(session.userId).toBe("1");
  });

  it("redirects to login when unauthenticated", async () => {
    getSessionValues.mockResolvedValue({ userId: undefined });
    getSession.mockResolvedValue({});
    destroySession.mockResolvedValue("session=;");

    try {
      await requireAdmin(makeRequest(""));
      throw new Error("expected a redirect");
    } catch (res) {
      expect((res as Response).status).toBe(302);
      expect((res as Response).headers.get("Location")).toBe("/auth/login");
    }
  });
});

describe("requirePermission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the session when the user is authenticated (bypasses checks)", async () => {
    getSessionValues.mockResolvedValue({ userId: "1" });
    const session = await requirePermission(makeRequest("session=abc"), "C", "product");
    expect(session.userId).toBe("1");
  });

  it("redirects when unauthenticated", async () => {
    getSessionValues.mockResolvedValue({ userId: undefined });
    getSession.mockResolvedValue({});
    destroySession.mockResolvedValue("session=;");

    try {
      await requirePermission(makeRequest(""), "C", "product");
      throw new Error("expected a redirect");
    } catch (res) {
      expect((res as Response).status).toBe(302);
      expect((res as Response).headers.get("Location")).toBe("/auth/login");
    }
  });
});
