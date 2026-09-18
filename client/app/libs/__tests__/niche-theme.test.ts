import { describe, it, expect, beforeEach } from "vitest";
import {
  NICHE_DEFAULT_HIDDEN,
  NICHE_PRESETS,
  applyNicheTheme,
  isNichePreset,
  isSidebarHidden,
  nicheTerm,
  resolveHiddenSidebar,
  resolveTerminology,
  resolveThemeVars,
} from "~/libs/niche-theme";

describe("isNichePreset", () => {
  it("recognises preset keys", () => {
    expect(isNichePreset("fashion")).toBe(true);
    expect(isNichePreset("food")).toBe(true);
    expect(isNichePreset("custom")).toBe(false);
    expect(isNichePreset("")).toBe(false);
    expect(isNichePreset(null)).toBe(false);
    expect(isNichePreset(42)).toBe(false);
  });
});

describe("resolveHiddenSidebar", () => {
  it("uses explicit sidebarHidden once saved", () => {
    expect(resolveHiddenSidebar({ sidebarHidden: ["staff"] })).toEqual(["staff"]);
    expect(resolveHiddenSidebar({ sidebarHidden: [] })).toEqual([]);
  });

  it("falls back to preset defaults", () => {
    expect(resolveHiddenSidebar({ preset: "fashion" })).toEqual(["staff", "shift"]);
    expect(resolveHiddenSidebar({ preset: "food" })).toEqual([]);
    expect(resolveHiddenSidebar({ preset: "beauty" })).toEqual(["shift"]);
  });

  it("defaults to fashion for missing or unknown presets", () => {
    expect(resolveHiddenSidebar()).toEqual(NICHE_DEFAULT_HIDDEN.fashion);
    expect(resolveHiddenSidebar(null)).toEqual(NICHE_DEFAULT_HIDDEN.fashion);
    expect(resolveHiddenSidebar({ preset: "nope" })).toEqual(NICHE_DEFAULT_HIDDEN.fashion);
  });
});

describe("isSidebarHidden", () => {
  it("matches hidden modules", () => {
    expect(isSidebarHidden("staff", { preset: "fashion" })).toBe(true);
    expect(isSidebarHidden("order", { preset: "fashion" })).toBe(false);
  });

  it("returns false without a module key", () => {
    expect(isSidebarHidden(undefined, { preset: "fashion" })).toBe(false);
    expect(isSidebarHidden("", { preset: "fashion" })).toBe(false);
  });
});

describe("resolveThemeVars", () => {
  it("resolves the preset palette", () => {
    const vars = resolveThemeVars({ preset: "food" });
    expect(vars["--color-primary"]).toBe(NICHE_PRESETS.food.primary);
    expect(vars["--color-accent"]).toBe(NICHE_PRESETS.food.accent);
  });

  it("lets manual colors win over the preset", () => {
    const vars = resolveThemeVars({ preset: "food", primaryColor: "#fff", accentColor: "#000" });
    expect(vars["--color-primary"]).toBe("#fff");
    expect(vars["--color-accent"]).toBe("#000");
  });

  it("defaults to fashion", () => {
    expect(resolveThemeVars()["--color-primary"]).toBe(NICHE_PRESETS.fashion.primary);
    expect(resolveThemeVars(null)["--color-primary"]).toBe(NICHE_PRESETS.fashion.primary);
  });
});

describe("resolveTerminology", () => {
  it("merges preset terminology with vendor overrides", () => {
    const terms = resolveTerminology({ preset: "food", terminology: { "sidebar.products": "Custom" } });
    expect(terms["sidebar.products"]).toBe("Custom");
    expect(terms["sidebar.orders"]).toBe("Gọi món");
  });

  it("returns an empty map without appearance", () => {
    expect(resolveTerminology()).toEqual({});
    expect(resolveTerminology(null)).toEqual({});
  });
});

describe("applyNicheTheme + nicheTerm", () => {
  beforeEach(() => {
    delete (window as any).__NICHE_TERMINOLOGY__;
    delete (window as any).__NICHE_HIDDEN__;
  });

  it("writes CSS variables and publishes terminology/hidden maps", () => {
    let changed = 0;
    const onChange = () => (changed += 1);
    window.addEventListener("niche-theme-change", onChange);

    applyNicheTheme({ preset: "food" });

    expect(document.documentElement.style.getPropertyValue("--color-primary")).toBe(
      NICHE_PRESETS.food.primary,
    );
    expect(nicheTerm("sidebar.orders")).toBe("Gọi món");
    expect(nicheTerm("missing.key")).toBeUndefined();
    expect((window as any).__NICHE_HIDDEN__).toEqual([]);
    expect(changed).toBe(1);
    window.removeEventListener("niche-theme-change", onChange);
  });
});
