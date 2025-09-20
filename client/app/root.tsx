import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import "~/assets/styles/tailwind.css";
import "~/assets/styles/index.scss";
import "animate.css";
import "feather-icons/dist/feather";
import { ErrorComponent } from "./components/error-component";
import { NotificationProvider } from "./components/notification";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
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
  return <Outlet />;
}

export const shouldRevalidate = () => false;

export function ErrorBoundary() {
  return <ErrorComponent />;
}
