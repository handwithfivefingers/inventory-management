import { useEffect, useState } from "react";
import { Icon } from "~/components/icon";
import { resolveTheme, useTheme } from "~/store/theme.store";
import { cn } from "~/libs/utils";
import { useTranslation } from "~/i18n";

interface IThemeToggle {
  className?: string;
}

export const ThemeToggle = ({ className }: IThemeToggle) => {
  const { t } = useTranslation();
  const theme = useTheme((state) => state.theme);
  const toggleTheme = useTheme((state) => state.toggleTheme);
  // Avoid SSR/CSR mismatch: the store hydrates after mount (see root.tsx).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolveTheme(theme) === "dark";

  return (
    <button
      type="button"
      aria-label={t("header.toggleTheme")}
      title={t("header.toggleTheme")}
      onClick={toggleTheme}
      className={cn("p-2 rounded-md cursor-pointer hover:bg-indigo-100 dark:hover:bg-slate-700", className)}
    >
      <Icon name={isDark ? "sun" : "moon"} className="w-4 h-4 text-indigo-950 dark:text-slate-200" />
    </button>
  );
};
