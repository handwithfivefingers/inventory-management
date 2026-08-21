import en from "~/assets/lang/en.json";
import vi from "~/assets/lang/vi.json";
import { useLocale } from "~/store/locale.store";

export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "vi";

type Dictionary = Record<string, unknown>;

const resources: Record<Locale, Dictionary> = { en, vi };

const lookup = (dictionary: Dictionary, key: string): unknown => {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Dictionary)[part];
    }
    return undefined;
  }, dictionary);
};

/**
 * Translate a key for the given locale.
 * Supports dot notation (e.g. "common.add") and falls back:
 * requested locale -> default locale -> the key itself.
 */
export const translate = (
  locale: Locale,
  key: string,
  options?: { defaultValue?: string },
): string => {
  const value = lookup(resources[locale] ?? {}, key);
  if (typeof value === "string") {
    return value;
  }
  const fallback = lookup(resources[DEFAULT_LOCALE] ?? {}, key);
  if (typeof fallback === "string") {
    return fallback;
  }
  return options?.defaultValue ?? key;
};

export const isLocale = (value: unknown): value is Locale => {
  return LOCALES.includes(value as Locale);
};

interface ITranslationOptions {
  defaultValue?: string;
}

/** React hook: returns a translator bound to the active locale. */
export const useTranslation = () => {
  const locale = useLocale((state) => state.locale);
  const setLocale = useLocale((state) => state.setLocale);
  const t = (key: string, options?: ITranslationOptions) => translate(locale, key, options);
  return { t, locale, setLocale };
};
