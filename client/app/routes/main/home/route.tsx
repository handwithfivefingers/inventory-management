import type { MetaFunction } from "@remix-run/node";
import { ErrorComponent } from "~/components/error-component";

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function Home() {
  return <>Home</>;
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
