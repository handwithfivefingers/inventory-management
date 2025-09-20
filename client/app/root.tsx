import type { ActionFunctionArgs } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, redirect } from "@remix-run/react";
import "animate.css";
import "feather-icons/dist/feather";
import "~/assets/styles/index.scss";
import { ErrorComponent } from "./components/error-component";
import { NotificationProvider } from "./components/notification";
import { destroySession, getSession } from "./sessions";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
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
