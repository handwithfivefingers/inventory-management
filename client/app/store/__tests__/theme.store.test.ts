import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTheme, isTheme, THEMES, DEFAULT_THEME, resolveTheme, applyTheme } from "../theme.store";

const setMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe("theme constants", () => {
  it("exposes the supported themes", () => {
    expect(THEMES).toEqual(["light", "dark", "system"]);
  });
  it("defaults to system", () => {
    expect(DEFAULT_THEME).toBe("system");
  });
});

describe("isTheme", () => {
  it("recognises valid themes", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(true);
  });
  it("rejects invalid themes", () => {
    expect(isTheme("neon")).toBe(false);
    expect(isTheme(1)).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});

describe("resolveTheme", () => {
  beforeEach(() => {
    setMatchMedia(false);
  });
  it("resolves explicit light/dark", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });
  it("resolves system to light when OS prefers light", () => {
    setMatchMedia(false);
    expect(resolveTheme("system")).toBe("light");
  });
  it("resolves system to dark when OS prefers dark", () => {
    setMatchMedia(true);
    expect(resolveTheme("system")).toBe("dark");
  });
});

describe("applyTheme", () => {
  it("toggles the dark class on <html>", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("sets the color-scheme style alongside the class", () => {
    applyTheme("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    applyTheme("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});

describe("useTheme store", () => {
  beforeEach(() => {
    useTheme.setState({ theme: DEFAULT_THEME });
    document.documentElement.classList.remove("dark");
  });

  it("sets the theme and applies it", () => {
    useTheme.getState().setTheme("dark");
    expect(useTheme.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("toggles the theme", () => {
    useTheme.getState().setTheme("light");
    useTheme.getState().toggleTheme();
    expect(useTheme.getState().theme).toBe("dark");
  });
});
