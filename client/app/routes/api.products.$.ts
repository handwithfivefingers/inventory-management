import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { parseCookieFromRequest } from "~/sessions";

const BACKEND_BASE = import.meta.env.VITE_API_PATH || "http://localhost:3001/api";

/**
 * Resource routes for product Excel features (all proxy the backend and
 * stream binary responses — never parsed as JSON):
 *   GET  /api/products/export           -> full xlsx export of vendor products
 *   GET  /api/products/import/template  -> xlsx import template
 *   POST /api/products/import           -> multipart upload of the filled template
 */
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { cookie } = await parseCookieFromRequest(request);
  const url = new URL(request.url);
  const kind = params["*"] || "";

  let backendUrl: string;
  if (kind === "export") {
    backendUrl = `${BACKEND_BASE}/products/export?${url.searchParams.toString()}`;
  } else if (kind === "import/template") {
    backendUrl = `${BACKEND_BASE}/products/import/template`;
  } else {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(backendUrl, {
    method: "GET",
    headers: { Cookie: cookie },
  });

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/octet-stream");
  const disposition = upstream.headers.get("Content-Disposition");
  if (disposition) headers.set("Content-Disposition", disposition);
  return new Response(upstream.body, { status: upstream.status, headers });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { cookie } = await parseCookieFromRequest(request);
  const kind = params["*"] || "";
  if (kind !== "import") {
    return new Response("Not found", { status: 404 });
  }

  // Forward the multipart body (file) untouched
  const upstream = await fetch(`${BACKEND_BASE}/products/import`, {
    method: "POST",
    headers: { Cookie: cookie, ...(request.headers.get("Content-Type") ? { "Content-Type": request.headers.get("Content-Type")! } : {}) },
    body: await request.arrayBuffer(),
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" },
  });
};
