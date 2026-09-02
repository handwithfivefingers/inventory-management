import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Helpers – static file-content assertions for the "warehouse UI pattern"
// ---------------------------------------------------------------------------

/**
 * Absolute path to the route file under test. Using `__dirname` keeps the
 * test relocatable even if the project is moved.
 */
const WAREHOUSE_ADD_FILE = path.resolve(__dirname, "../index.tsx");
const WAREHOUSE_DETAIL_FILE = path.resolve(__dirname, "../../$id/index.tsx");
const BREADCRUMB_FILE = path.resolve(__dirname, "../../../../../components/breadcrumb/index.tsx");
const APP_LAYOUT_FILE = path.resolve(__dirname, "../../../../../components/layouts/index.tsx");
const LAYOUT_FILE = path.resolve(__dirname, "../../../_layout.tsx");

const readSource = (filePath: string): string => fs.readFileSync(filePath, "utf-8");

export function assertWarehousePattern(source: string, routeLabel: string) {
  // 1. outer container has p-3 gap-3 bg-slate-50/50 (all three tokens in same className)
  const hasOuterContainer =
    source.includes("p-3") && source.includes("gap-3") && source.includes("bg-slate-50/50");
  expect(
    hasOuterContainer,
    `${routeLabel}: outer container must contain p-3, gap-3 and bg-slate-50/50`,
  ).toBe(true);

  // Also verify they appear in the same outer wrapper class (flex flex-col p-3 gap-3)
  expect(source, `${routeLabel}: outer container className fragment missing`).toMatch(
    /className="[^"]*p-3[^"]*gap-3[^"]*bg-slate-50\/50[^"]*"/,
  );

  // 1b. constrained width container (max-w-3xl / max-w-5xl etc)
  expect(source, `${routeLabel}: must have max-w-* constrained container`).toMatch(/max-w-/);

  // 2. CardItem has p-5 sm:p-6 — use includes to avoid brittle multiline regex
  expect(source, `${routeLabel}: CardItem must have className p-5 sm:p-6`).toContain("p-5 sm:p-6");
  expect(source, `${routeLabel}: must import CardItem`).toContain("CardItem");

  // 3. no breadcrumb arrow-left (legacy breadcrumb pattern)
  expect(
    source.includes("arrow-left"),
    `${routeLabel}: must not contain breadcrumb arrow-left`,
  ).toBe(false);

  // 4. header has Icon and title (h2)
  expect(source, `${routeLabel}: header must contain an <h2>`).toMatch(/<h2[^>]*>/);
  expect(source, `${routeLabel}: header must contain an <Icon`).toMatch(/<Icon[^>]*name=/);

  // 4b. header icon container has rounded-xl bg-indigo-50 (warehouse pattern header)
  expect(source, `${routeLabel}: header icon container must have rounded-xl`).toContain("rounded-xl");
  expect(source, `${routeLabel}: header icon container must have bg-indigo-50`).toContain("bg-indigo-50");
}

export function assertWarehouseAddSpecific(source: string) {
  // Header Icon is specifically "plus" for warehouses
  expect(source, `warehouse add: header Icon must be name="plus"`).toMatch(/<Icon[^>]*name="plus"/);

  // Title element is present inside CardItem title prop
  expect(source, `warehouse add: CardItem title must contain h2 with warehouses title`).toMatch(
    /warehouses\.addTitle|Thêm kho|warehouse/i,
  );
}

export function assertFooterPattern(source: string, routeLabel: string) {
  // Routes that delegate footer to a shared component (e.g. OrderForm) don't
  // have the buttons directly in the route file – skip strict footer checks there.
  const delegatesFooter = source.includes("OrderForm");
  if (delegatesFooter) return;

  // ghost cancel button: variant="ghost"
  expect(source, `${routeLabel}: footer must have ghost cancel button`).toMatch(
    /variant="ghost"/,
  );
  // save button: htmlType="submit"
  expect(source, `${routeLabel}: footer must have save button with htmlType="submit"`).toMatch(
    /htmlType="submit"/,
  );
  expect(source, `${routeLabel}: footer save button must contain Icon name="save"`).toMatch(
    /name="save"/,
  );
  // footer has border-t separator
  expect(source, `${routeLabel}: footer must have border-t separator`).toContain("border-t");
}

export function assertBreadcrumbPattern(source: string, label: string) {
  // Breadcrumb component static checks
  expect(source, `${label}: must import useLocation`).toContain("useLocation");
  expect(source, `${label}: must have aria-label="Breadcrumb"`).toContain('aria-label="Breadcrumb"');
  expect(source, `${label}: must use chevron-right separator (not arrow-left)`).toContain("chevron-right");
  expect(source, `${label}: must not contain arrow-left`).not.toContain("arrow-left");
  expect(source, `${label}: must handle root path hide`).toMatch(/pathname === "\/"/);
  expect(source, `${label}: must have LABELS map with warehouses`).toContain("warehouses");
  expect(source, `${label}: must have nav with bg-slate-50/50`).toContain("bg-slate-50/50");
  expect(source, `${label}: must render Trang chủ as first crumb`).toContain("Trang chủ");
}

export function assertGlobalBreadcrumb(layoutSource: string, breadcrumbSource: string, label: string) {
  // AppLayout must render global Breadcrumb
  expect(layoutSource, `${label}: AppLayout must import Breadcrumb`).toMatch(/import.*Breadcrumb.*from/);
  expect(layoutSource, `${label}: AppLayout must render <Breadcrumb`).toContain("<Breadcrumb");
  // No local breadcrumb arrow-left in routes that use global breadcrumb
  expect(layoutSource, `${label}: AppLayout must not use arrow-left`).not.toContain("arrow-left");
  // Verify LAYOUT_FILE wraps Outlet with AppLayout
  const mainLayoutSource = readSource(LAYOUT_FILE);
  expect(mainLayoutSource, `${label}: _layout must import AppLayout`).toContain("AppLayout");
  expect(mainLayoutSource, `${label}: _layout must render <AppLayout>`).toContain("<AppLayout");
  expect(breadcrumbSource, `${label}: breadcrumb file exists and is not empty`).not.toHaveLength(0);
}

// ---------------------------------------------------------------------------
// 1) Dedicated warehouse add route – exhaustive checks
// ---------------------------------------------------------------------------

describe("warehouses/add – warehouse UI pattern", () => {
  const source = readSource(WAREHOUSE_ADD_FILE);

  it("outer container has p-3 gap-3 bg-slate-50/50", () => {
    expect(source).toMatch(/className="[^"]*p-3[^"]*gap-3[^"]*bg-slate-50\/50[^"]*"/);
    expect(source).toContain("p-3");
    expect(source).toContain("gap-3");
    expect(source).toContain("bg-slate-50/50");
  });

  it("has max-w constrained container", () => {
    expect(source).toMatch(/max-w-/);
    expect(source).toContain("max-w-3xl");
  });

  it("CardItem has p-5 sm:p-6", () => {
    expect(source).toContain("p-5 sm:p-6");
    expect(source).toContain("CardItem");
  });

  it("has no breadcrumb arrow-left", () => {
    expect(source).not.toMatch(/arrow-left/);
  });

  it("header has Icon plus, rounded-xl bg-indigo-50 and title", () => {
    // Icon plus inside the CardItem title header
    expect(source).toMatch(/<Icon[^>]*name="plus"/);
    expect(source).toMatch(/<h2[^>]*>/);
    expect(source).toContain("rounded-xl");
    expect(source).toContain("bg-indigo-50");
    // title key for warehouses
    expect(source).toMatch(/warehouses\.addTitle/);
  });

  it("footer has ghost cancel, border-t and save button with Icon save", () => {
    // cancel
    expect(source).toMatch(/variant="ghost"/);
    expect(source).toMatch(/to="\/warehouses"/);
    expect(source).toContain("border-t");
    // save
    expect(source).toMatch(/htmlType="submit"/);
    expect(source).toMatch(/name="save"/);
  });
});

// ---------------------------------------------------------------------------
// 1b) Dedicated warehouse detail/edit route – same UI pattern as add
// ---------------------------------------------------------------------------

describe("warehouses/$id – warehouse UI pattern (read/edit)", () => {
  const source = readSource(WAREHOUSE_DETAIL_FILE);

  it("exists and uses same outer container pattern as add", () => {
    expect(source).toMatch(/className="[^"]*p-3[^"]*gap-3[^"]*bg-slate-50\/50[^"]*"/);
    expect(source).toContain("max-w-");
    expect(source).toContain("max-w-3xl");
  });

  it("CardItem has p-5 sm:p-6 and no arrow-left", () => {
    expect(source).toContain("p-5 sm:p-6");
    expect(source).toContain("CardItem");
    expect(source).not.toMatch(/arrow-left/);
  });

  it("header has rounded-xl bg-indigo-50, Icon and h2", () => {
    expect(source).toContain("rounded-xl");
    expect(source).toContain("bg-indigo-50");
    expect(source).toMatch(/<Icon[^>]*name=/);
    expect(source).toMatch(/<h2[^>]*>/);
  });

  it("footer (EditForm) has ghost cancel, border-t and save with Icon save", () => {
    // EditForm footer inside same file
    expect(source).toMatch(/variant="ghost"/);
    expect(source).toContain("border-t");
    expect(source).toMatch(/htmlType="submit"/);
    expect(source).toMatch(/name="save"/);
  });

  it("conforms to full warehouse pattern helper", () => {
    assertWarehousePattern(source, "warehouses/$id");
    assertFooterPattern(source, "warehouses/$id");
  });
});

// ---------------------------------------------------------------------------
// 1c) Breadcrumb component pattern
// ---------------------------------------------------------------------------

describe("breadcrumb component – warehouse UI pattern", () => {
  const source = readSource(BREADCRUMB_FILE);
  const layoutSource = readSource(APP_LAYOUT_FILE);

  it("breadcrumb component has required structure and tokens", () => {
    assertBreadcrumbPattern(source, "breadcrumb");
  });

  it("breadcrumb has no arrow-left legacy pattern", () => {
    expect(source).not.toContain("arrow-left");
    expect(source).toContain("chevron-right");
  });

  it("breadcrumb handles labels for warehouses/add/edit/importOrder numeric id fallback", () => {
    expect(source).toContain('warehouses: "Kho hàng"');
    expect(source).toContain('add: "Thêm mới"');
    expect(source).toContain('edit: "Chỉnh sửa"');
    expect(source).toContain("Chi tiết");
  });

  it("global breadcrumb via AppLayout (layouts/index.tsx) renders Breadcrumb once", () => {
    assertGlobalBreadcrumb(layoutSource, source, "global breadcrumb");
  });

  it("AppLayout breadcrumb has bg-slate-50/50 to match warehouse outer container", () => {
    expect(source).toContain("bg-slate-50/50");
  });
});

// ---------------------------------------------------------------------------
// 2) Parametrized / generic helper – warehouse pattern across all add routes
// ---------------------------------------------------------------------------

/**
 * Discover every `add/index.tsx` route under `app/routes/_index+` and assert
 * the shared warehouse pattern. Routes that intentionally diverge can be added
 * to `ALLOWLIST_EXCEPTIONS` with a reason.
 */
const ADD_ROUTES_ROOT = path.resolve(__dirname, "../../../..");

function discoverAddRoutes(): string[] {
  const results: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // `add` folder with index.tsx inside
        if (entry.name === "add" && fs.existsSync(path.join(full, "index.tsx"))) {
          results.push(path.join(full, "index.tsx"));
        } else if (entry.name === "add" && fs.existsSync(path.join(full, "route.tsx"))) {
          results.push(path.join(full, "route.tsx"));
        }
        // recurse (avoid node_modules)
        if (entry.name !== "node_modules" && entry.name !== "__tests__") {
          try {
            walk(full);
          } catch {
            // ignore permission errors
          }
        }
      }
    }
  };
  walk(ADD_ROUTES_ROOT);
  return results.sort();
}

describe("add routes – parametrized warehouse pattern conformance", () => {
  const addFiles = discoverAddRoutes();

  it("discovers at least the warehouse add route", () => {
    expect(addFiles.length).toBeGreaterThan(0);
    expect(addFiles.some((f) => f.includes("warehouses"))).toBe(true);
  });

  // Run the shared pattern for every discovered add route.
  // Invoices add is a selector page (list orders to invoice), not a form,
  // so it has no ghost cancel / save footer.
  const SKIP_FOOTER_FOR: string[] = ["_index+/invoices+/add/index.tsx"];

  const ALLOWLIST_EXCEPTIONS: Record<string, string> = {
    // Example: "_index+/orders+/add/route.tsx": "legacy page – not yet migrated to warehouse pattern",
  };

  it.each(addFiles.map((f) => [path.relative(ADD_ROUTES_ROOT, f), f] as const))(
    "%s conforms to warehouse UI pattern",
    (relative, fullPath) => {
      if (ALLOWLIST_EXCEPTIONS[relative]) return;
      const source = readSource(fullPath);
      const label = relative;
      assertWarehousePattern(source, label);
      if (!SKIP_FOOTER_FOR.includes(relative)) {
        assertFooterPattern(source, label);
      }
    },
  );
});

// ---------------------------------------------------------------------------
// 3) Edit/detail routes – ensure they also follow warehouse pattern
// ---------------------------------------------------------------------------

function discoverDetailRoutes(): string[] {
  const results: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // $id folder: contains index.tsx or route.tsx
        if (entry.name.startsWith("$") && (fs.existsSync(path.join(full, "index.tsx")) || fs.existsSync(path.join(full, "route.tsx")))) {
          const candidate = fs.existsSync(path.join(full, "index.tsx")) ? path.join(full, "index.tsx") : path.join(full, "route.tsx");
          results.push(candidate);
        }
        if (entry.name !== "node_modules" && entry.name !== "__tests__") {
          try {
            walk(full);
          } catch {
            // ignore
          }
        }
      }
    }
  };
  walk(ADD_ROUTES_ROOT);
  return results.sort();
}

describe("detail/edit routes – warehouse UI pattern (where applicable)", () => {
  const detailFiles = discoverDetailRoutes();

  it("discovers at least the warehouse detail route", () => {
    expect(detailFiles.some((f) => f.includes("warehouses"))).toBe(true);
  });

  // Only warehouse detail is required to strictly conform; other detail pages
  // may still be on legacy patterns. We assert warehouse detail and do a
  // best-effort check for others that already use bg-slate-50/50.
  it.each(
    detailFiles
      .filter((f) => f.includes("warehouses"))
      .map((f) => [path.relative(ADD_ROUTES_ROOT, f), f] as const),
  )("%s (warehouse detail) conforms to warehouse UI pattern", (relative, fullPath) => {
    const source = readSource(fullPath);
    assertWarehousePattern(source, relative);
    assertFooterPattern(source, relative);
  });

  it("all detail routes that already use bg-slate-50/50 must also have max-w, p-5 sm:p-6, bg-indigo-50, border-t and no arrow-left", () => {
    for (const fullPath of detailFiles) {
      const source = readSource(fullPath);
      if (!source.includes("bg-slate-50/50")) continue; // legacy page – skip strict check
      const relative = path.relative(ADD_ROUTES_ROOT, fullPath);
      expect(source, `${relative}: must have max-w-`).toContain("max-w-");
      expect(source, `${relative}: must have p-5 sm:p-6`).toContain("p-5 sm:p-6");
      expect(source, `${relative}: must have bg-indigo-50`).toContain("bg-indigo-50");
      expect(source, `${relative}: must have rounded-xl`).toContain("rounded-xl");
      expect(source, `${relative}: must not contain arrow-left`).not.toContain("arrow-left");
    }
  });
});
