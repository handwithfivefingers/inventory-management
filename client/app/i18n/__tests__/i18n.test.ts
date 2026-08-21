import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { translate, isLocale, useTranslation, DEFAULT_LOCALE } from "../index";

describe("translate", () => {
  it("returns the translated string for the requested locale", () => {
    expect(translate("vi", "common.add")).toBe("Thêm");
    expect(translate("en", "common.add")).toBe("Add");
  });

  it("returns the translated string for the default locale", () => {
    // DEFAULT_LOCALE is "vi"; both locales ship identical key sets, so the
    // requested-locale branch is exercised here.
    expect(translate(DEFAULT_LOCALE, "common.add")).toBe("Thêm");
  });

  it("returns the defaultValue when the key is missing everywhere", () => {
    expect(translate("en", "missing.key", { defaultValue: "Fallback" })).toBe("Fallback");
  });

  it("returns the raw key when nothing matches and no defaultValue is given", () => {
    expect(translate("en", "totally.missing.key")).toBe("totally.missing.key");
  });

  it("supports dot-notation nested lookups", () => {
    expect(translate("vi", "sidebar.products")).toBeTruthy();
  });
});

describe("isLocale", () => {
  it("recognises valid locales", () => {
    expect(isLocale("vi")).toBe(true);
    expect(isLocale("en")).toBe(true);
  });
  it("rejects invalid locales", () => {
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(123)).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe("useTranslation", () => {
  it("exposes a translator bound to the active locale", () => {
    const { result } = renderHook(() => useTranslation());
    expect(typeof result.current.t).toBe("function");
    expect(typeof result.current.setLocale).toBe("function");

    act(() => result.current.setLocale("en"));
    expect(result.current.locale).toBe("en");
    expect(result.current.t("common.add")).toBe("Add");

    act(() => result.current.setLocale("vi"));
    expect(result.current.t("common.add")).toBe("Thêm");
  });
});
