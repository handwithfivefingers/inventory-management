import { ActionFunctionArgs } from "@remix-run/node";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "~/action.client/auth.service";
import { commitSession, getSession } from "~/sessions";

vi.mock("~/action.client/auth.service", () => ({
  AuthService: {
    login: vi.fn(),
  },
}));

import { action } from "../index";

const mockedLogin = vi.mocked(AuthService.login);

const buildRequest = async (cookie?: string) => {
  const body = new URLSearchParams({
    data: JSON.stringify({ email: "handgod1995@gmail.com", password: "123456" }),
  }).toString();
  return new Request("http://localhost/auth/login", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(cookie ? { cookie } : {}),
    },
  }) as unknown as ActionFunctionArgs["request"];
};

/** Builds an incoming `ss_storage=...` cookie pre-filled with the given values. */
const makeSessionCookie = async (values: Record<string, string | number>) => {
  const session = await getSession();
  Object.entries(values).forEach(([key, value]) => session.set(key as "userId", value as string));
  return commitSession(session);
};

/** Reads the session written by the redirect's Set-Cookie header. */
const readSessionFrom = async (setCookie: string | null) => {
  expect(setCookie).toContain("ss_storage=");
  return getSession(setCookie!);
};

describe("login action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("seeds token, userId and default vendor/warehouse on first-time login", async () => {
    mockedLogin.mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: "user-1",
          token: "jwt-token",
          defaultVendorId: 2,
          defaultWarehouseId: 22,
        },
      },
    } as never);

    // Fresh browser: no ss_storage cookie at all.
    const response = (await action({
      request: await buildRequest(),
      params: {},
      context: {},
    })) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");

    const session = await readSessionFrom(response.headers.get("set-cookie"));
    expect(session.get("token")).toBe("jwt-token");
    expect(session.get("userId")).toBe("user-1");
    // Regression: the very first document request after login runs page
    // loaders in parallel against this cookie — it must already carry the
    // warehouse selection, otherwise data is fetched without a warehouseId.
    expect(session.get("vendorId")).toBe(2);
    expect(session.get("warehouseId")).toBe(22);
  });

  it("does not overwrite an existing vendor/warehouse selection", async () => {
    mockedLogin.mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: "user-1",
          token: "jwt-token",
          defaultVendorId: 9,
          defaultWarehouseId: 99,
        },
      },
    } as never);

    const incomingCookie = await makeSessionCookie({
      vendorId: 1,
      warehouseId: 11,
      userId: "old-user",
    });

    const response = (await action({
      request: await buildRequest(incomingCookie),
      params: {},
      context: {},
    })) as Response;

    const session = await readSessionFrom(response.headers.get("set-cookie"));
    expect(session.get("token")).toBe("jwt-token"); // token refreshed
    expect(session.get("userId")).toBe("user-1");
    expect(session.get("vendorId")).toBe(1);
    expect(session.get("warehouseId")).toBe(11);
  });

  it("returns an error message when login fails", async () => {
    mockedLogin.mockResolvedValue({
      status: 401,
      error: { error: "Invalid credentials" },
    } as never);

    const result = await action({ request: await buildRequest(), params: {}, context: {} });

    expect(result).toEqual({ message: "Invalid credentials" });
  });
});
