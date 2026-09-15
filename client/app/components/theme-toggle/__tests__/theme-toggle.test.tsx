import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";

// jsdom lacks matchMedia - mock it like the real browser
beforeEach(() => {
  if (!window.matchMedia) {
    (window as any).matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
  document.documentElement.className = "";
  localStorage.clear();
  cleanup();
});

describe("ThemeToggle diagnostics", () => {
  it("clicking toggles the dark class on <html> without reload", async () => {
    const { applyTheme, useTheme } = await import("~/store/theme.store");
    const { ThemeToggle } = await import("~/components/theme-toggle");

    // Simulate the root.tsx wiring: apply on subscribe
    const unsubscribe = useTheme.subscribe((state: any) => applyTheme(state.theme));
    useTheme.persist.rehydrate();
    applyTheme(useTheme.getState().theme);

    render(<ThemeToggle />);

    // Start in light
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(useTheme.getState().theme).toBe("dark");

    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    unsubscribe();
  });

  it("persisted theme survives a rehydrate (simulated reload)", async () => {
    const { applyTheme, useTheme } = await import("~/store/theme.store");
    localStorage.setItem("theme-storage", JSON.stringify({ state: { theme: "dark" }, version: 0 }));
    useTheme.persist.rehydrate();
    applyTheme(useTheme.getState().theme);
    expect(useTheme.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
