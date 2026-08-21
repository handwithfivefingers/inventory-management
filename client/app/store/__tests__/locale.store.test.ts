import { describe, it, expect, beforeEach } from "vitest";
import { useLocale } from "../locale.store";
import { DEFAULT_LOCALE, LOCALES } from "~/i18n";

describe("useLocale store", () => {
  beforeEach(() => {
    useLocale.setState({ locale: DEFAULT_LOCALE });
  });

  it("defaults to the default locale", () => {
    expect(useLocale.getState().locale).toBe(DEFAULT_LOCALE);
  });

  it("updates the locale via setLocale", () => {
    useLocale.getState().setLocale("en");
    expect(useLocale.getState().locale).toBe("en");
  });

  it("switches back and forth between locales", () => {
    useLocale.getState().setLocale("en");
    expect(useLocale.getState().locale).toBe("en");
    useLocale.getState().setLocale("vi");
    expect(useLocale.getState().locale).toBe("vi");
  });

  it("exposes a default locale that is a recognised locale", () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
  });
});
