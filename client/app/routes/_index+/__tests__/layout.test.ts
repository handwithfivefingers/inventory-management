import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Breadcrumb / AppLayout static pattern checks (warehouse UI pattern)
// ---------------------------------------------------------------------------

const BREADCRUMB_FILE = path.resolve(__dirname, "../../../components/breadcrumb/index.tsx");
const APP_LAYOUT_FILE = path.resolve(__dirname, "../../../components/layouts/index.tsx");
const MAIN_LAYOUT_FILE = path.resolve(__dirname, "../_layout.tsx");

const readSource = (f: string) => fs.readFileSync(f, "utf-8");

describe("breadcrumb component – static pattern", () => {
  const source = readSource(BREADCRUMB_FILE);

  it("exists and has aria-label Breadcrumb", () => {
    expect(source).toContain('aria-label="Breadcrumb"');
  });

  it("uses chevron-right not arrow-left and has bg-slate-50/50", () => {
    expect(source).toContain("chevron-right");
    expect(source).not.toContain("arrow-left");
    expect(source).toContain("bg-slate-50/50");
  });

  it("has LABELS map covering warehouses/add/edit/importOrder", () => {
    expect(source).toContain('warehouses: "Kho hàng"');
    expect(source).toContain('add: "Thêm mới"');
    expect(source).toContain('edit: "Chỉnh sửa"');
    expect(source).toContain("Trang chủ");
  });

  it("hides on root and handles numeric id fallback (Chi tiết)", () => {
    expect(source).toMatch(/pathname === "\/"/);
    expect(source).toContain("Chi tiết");
  });
});

describe("global breadcrumb via layouts", () => {
  const appLayoutSource = readSource(APP_LAYOUT_FILE);
  const mainLayoutSource = readSource(MAIN_LAYOUT_FILE);
  const breadcrumbSource = readSource(BREADCRUMB_FILE);

  it("AppLayout imports and renders <Breadcrumb />", () => {
    expect(appLayoutSource).toMatch(/import.*Breadcrumb.*from/);
    expect(appLayoutSource).toContain("<Breadcrumb");
  });

  it("_layout wraps Outlet with AppLayout (global breadcrumb propagation)", () => {
    expect(mainLayoutSource).toContain("AppLayout");
    expect(mainLayoutSource).toContain("<AppLayout");
    expect(mainLayoutSource).toContain("<Outlet");
  });

  it("no local arrow-left in AppLayout (legacy breadcrumb removed)", () => {
    expect(appLayoutSource).not.toContain("arrow-left");
    expect(breadcrumbSource).not.toContain("arrow-left");
  });

  it("Breadcrumb nav has w-full px-3 pt-3 and shrink-0 (consistent with warehouse outer p-3)", () => {
    expect(breadcrumbSource).toContain("px-3");
    expect(breadcrumbSource).toContain("pt-3");
    expect(breadcrumbSource).toContain("shrink-0");
  });
});

// ---------------------------------------------------------------------------
// _layout loader – mocked sessions to reflect current implementation
// Current _layout loader only checks userId and returns {} or redirects
// ---------------------------------------------------------------------------

vi.mock("~/action.server/auth.service", () => ({
  AuthService: { getMe: vi.fn() },
}));
vi.mock("~/action.server/setting.service", () => ({
  settingService: { getSettings: vi.fn().mockResolvedValue({ currency: "VND" }) },
  DEFAULT_SETTINGS: { currency: "USD" },
}));
vi.mock("~/components/layouts", () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("~/components/error-component", () => ({ ErrorComponent: () => null }));
vi.mock("~/sessions", async () => {
  const actual = await vi.importActual<typeof import("~/sessions")>("~/sessions");
  return {
    ...actual,
    parseCookieFromRequest: vi.fn(),
    destroySession: vi.fn().mockResolvedValue(""),
  };
});

import { loader } from "../_layout";
import { parseCookieFromRequest } from "~/sessions";

const mockedParse = vi.mocked(parseCookieFromRequest);

describe("_layout loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns {} when authenticated (userId present)", async () => {
    mockedParse.mockResolvedValue({ userId: "user-1", session: {} as never, vendorId: 1, warehouseId: 11, cookie: "" } as never);
    const request = new Request("http://localhost/dashboard");
    const result = await loader({ request, params: {}, context: {} } as never);
    expect(result).toEqual({});
    expect(mockedParse).toHaveBeenCalledWith(request);
  });

  it("throws redirect to /auth/login when unauthenticated", async () => {
    const fakeSession = { flash: vi.fn() } as unknown as never;
    mockedParse.mockResolvedValue({ userId: undefined, session: fakeSession as never, vendorId: undefined, warehouseId: undefined, cookie: "" } as never);
    const request = new Request("http://localhost/dashboard");
    const error = (await loader({ request, params: {}, context: {} } as never).catch((e) => e)) as Response;
    expect(error).toBeInstanceOf(Response);
    expect(error.status).toBe(302);
    expect(error.headers.get("location")).toBe("/auth/login");
  });

  it("propagates Breadcrumb via AppLayout: loader does not interfere with breadcrumb rendering", async () => {
    // Loader success should still allow layout to render AppLayout which contains Breadcrumb
    mockedParse.mockResolvedValue({ userId: "user-1", session: {} as never, vendorId: 1, warehouseId: 11, cookie: "" } as never);
    const request = new Request("http://localhost/warehouses/add");
    const result = await loader({ request, params: {}, context: {} } as never);
    expect(result).toEqual({});
    // Static guarantee: AppLayout contains Breadcrumb (tested above)
    expect(readSource(APP_LAYOUT_FILE)).toContain("<Breadcrumb");
  });
});
