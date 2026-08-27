import { LoaderFunctionArgs } from "@remix-run/node";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "~/action.server/auth.service";
import { commitSession, getSession } from "~/sessions";

vi.mock("~/action.server/auth.service", () => ({
  AuthService: {
    getMe: vi.fn(),
  },
}));

vi.mock("~/action.server/setting.service", () => ({
  settingService: {
    getSettings: vi.fn().mockResolvedValue({ currency: "VND" }),
  },
  DEFAULT_SETTINGS: { currency: "USD" },
}));

// The route file pulls in the whole layout UI tree; keep it out of the test.
vi.mock("~/components/layouts", () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("~/components/error-component", () => ({ ErrorComponent: () => null }));

import { loader } from "../_layout";

const mockedGetMe = vi.mocked(AuthService.getMe);

const userFixture = {
  id: "user-1",
  defaultVendorId: 2,
  defaultWarehouseId: 22,
  vendors: [
    { id: 1, name: "HCM", warehouses: [{ id: 11, name: "HCM Main", isMain: true }] },
    { id: 2, name: "TruyenMai", warehouses: [{ id: 21, name: "TM A" }, { id: 22, name: "TM Main", isMain: true }] },
  ],
};

const makeSessionCookie = async (values: Record<string, string | number>) => {
  const session = await getSession();
  Object.entries(values).forEach(([key, value]) => session.set(key as never, value));
  return commitSession(session);
};

const callLoader = async (cookie?: string) => {
  const request = new Request("http://localhost/dashboard", {
    headers: cookie ? { cookie } : undefined,
  });
  return loader({ request, params: {}, context: {} } as LoaderFunctionArgs);
};

describe("_layout loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetMe.mockResolvedValue({
      status: 200,
      data: { data: userFixture },
    } as never);
  });

  it("returns the seeded defaults on a fresh login (no vendor/warehouse in cookie)", async () => {
    // Incoming cookie only carries what the login action set before this fix.
    const incomingCookie = await makeSessionCookie({ token: "jwt", userId: "user-1" });

    const response = await callLoader(incomingCookie);

    expect(response.status).toBe(200);
    const data = await response.json();

    // Regression: must return the values actually stored in the session after
    // seeding — not the empty locals read from the pre-seed cookie.
    expect(data.selectedVendorId).toBe(2);
    expect(data.selectedWarehouseId).toBe(22);
    expect(data.user.defaultWarehouseId).toBe(22);

    // And the seeded values are committed back so parallel/child loaders and
    // subsequent navigations see the same selection.
    const setCookie = response.headers.get("set-cookie")!;
    const session = await getSession(setCookie);
    expect(session.get("vendorId")).toBe(2);
    expect(session.get("warehouseId")).toBe(22);
  });

  it("honors an existing selection from the cookie", async () => {
    const incomingCookie = await makeSessionCookie({
      token: "jwt",
      userId: "user-1",
      vendorId: 1,
      warehouseId: 11,
    });

    const response = await callLoader(incomingCookie);
    const data = await response.json();

    expect(data.selectedVendorId).toBe(1);
    expect(data.selectedWarehouseId).toBe(11);

    // Settings load with the resolved vendorId.
    const { settingService } = await import("~/action.server/setting.service");
    expect(settingService.getSettings).toHaveBeenCalledWith(
      expect.objectContaining({ vendorId: 1 }),
    );
  });

  it("redirects to login when unauthenticated", async () => {
    // The loader throws the redirect Response (Remix convention).
    const redirect = (await callLoader().catch((error) => error)) as Response;
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("location")).toBe("/auth/login");
  });
});
