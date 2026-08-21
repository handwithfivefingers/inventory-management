import { LOCALES, Locale, useTranslation } from "~/i18n";
import { cn } from "~/libs/utils";

const LOCALE_LABELS: Record<Locale, string> = {
  vi: "VI",
  en: "EN",
};

interface ILanguageToggle {
  className?: string;
}

export const LanguageToggle = ({ className }: ILanguageToggle) => {
  const { t, locale, setLocale } = useTranslation();
  const nextLocale: Locale = locale === "vi" ? "en" : "vi";

  return (
    <button
      type="button"
      aria-label={t("header.language")}
      title={t("header.language")}
      onClick={() => setLocale(nextLocale)}
      className={cn(
        "p-2 rounded-md cursor-pointer text-xs font-bold hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-950 dark:text-slate-200",
        className
      )}
    >
      {LOCALE_LABELS[locale]}
    </button>
  );
};

export { LOCALES };
