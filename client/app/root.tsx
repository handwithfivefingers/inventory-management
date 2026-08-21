import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import "~/assets/styles/tailwind.css";
import "~/assets/styles/index.scss";
import "animate.css";
import "feather-icons/dist/feather";
import { useEffect } from "react";
import { ErrorComponent } from "./components/error-component";
import { NotificationProvider } from "./components/notification";
import { domAnimation, LazyMotion } from "motion/react";
import { useLocale } from "~/store/locale.store";
import { applyTheme, useTheme } from "~/store/theme.store";

/**
 * Applies the persisted theme before first paint to avoid a flash
 * of the wrong color scheme. Kept in sync with theme.store.ts.
 */
const themeScript = `
(function () {
  try {
    var raw = localStorage.getItem("theme-storage");
    var theme = raw ? (JSON.parse(raw).state || {}).theme : "system";
    var isDark =
      theme === "dark" ||
      (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  } catch (e) {}
})();
`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-white dark:bg-slate-700">
        {children}
        <ScrollRestoration />
        <Scripts />
        <NotificationProvider />
      </body>
    </html>
  );
}

export default function App() {
  // Rehydrate client preferences after mount so SSR markup matches,
  // then keep the <html> class in sync with the stored theme.
  useEffect(() => {
    useTheme.persist.rehydrate();
    useLocale.persist.rehydrate();
    applyTheme(useTheme.getState().theme);
    const unsubscribe = useTheme.subscribe((state) => applyTheme(state.theme));

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (useTheme.getState().theme === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", onSystemChange);
    return () => {
      unsubscribe();
      media.removeEventListener("change", onSystemChange);
    };
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <Outlet />
    </LazyMotion>
  );
}

export const shouldRevalidate = () => false;

export function ErrorBoundary() {
  return <ErrorComponent />;
}
