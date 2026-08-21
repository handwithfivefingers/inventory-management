import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { DEFAULT_LOCALE, Locale, isLocale } from "~/i18n";

interface ILocaleState {
  locale: Locale;
}

type Actions = {
  setLocale: (locale: Locale) => void;
};

const initialState: ILocaleState = {
  locale: DEFAULT_LOCALE,
};

const useLocale = create<ILocaleState & Actions>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        setLocale: (locale) => set(() => ({ locale })),
      }),
      {
        name: "locale-storage",
        // Hydration is triggered manually on the client (see root.tsx)
        // so server and client render the same markup on first paint.
        skipHydration: true,
        merge: (persisted, current) => {
          const state = (persisted as ILocaleState | undefined)?.locale;
          return { ...current, locale: isLocale(state) ? state : current.locale };
        },
      }
    )
  )
);

export { useLocale };
