import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "system";

export const isTheme = (value: unknown): value is Theme => {
  return THEMES.includes(value as Theme);
};

/** Resolve a theme against the OS preference. */
export const resolveTheme = (theme: Theme): "light" | "dark" => {
  if (theme !== "system") {
    return theme;
  }
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

/** Apply the resolved theme to the <html> element. */
export const applyTheme = (theme: Theme) => {
  if (typeof document === "undefined") {
    return;
  }
  const isDark = resolveTheme(theme) === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
};

interface IThemeState {
  theme: Theme;
}

type Actions = {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const initialState: IThemeState = {
  theme: DEFAULT_THEME,
};

const useTheme = create<IThemeState & Actions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        setTheme: (theme) => {
          applyTheme(theme);
          set(() => ({ theme }));
        },
        toggleTheme: () => {
          const next: Theme = resolveTheme(get().theme) === "dark" ? "light" : "dark";
          get().setTheme(next);
        },
      }),
      {
        name: "theme-storage",
        // Hydration is triggered manually on the client (see root.tsx);
        // an inline script in Layout applies the stored class pre-paint.
        skipHydration: true,
        merge: (persisted, current) => {
          const state = (persisted as IThemeState | undefined)?.theme;
          return { ...current, theme: isTheme(state) ? state : current.theme };
        },
      }
    )
  )
);

export { useTheme };
