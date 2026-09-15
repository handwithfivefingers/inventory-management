import { ActionFunctionArgs } from "@remix-run/node";
import { signQzRequest } from "~/libs/qz-sign.server";
import { parseCookieFromRequest } from "~/sessions";

/**
 * QZ Tray signing oracle: POST /api/qz-sign { toSign } -> base64 signature.
 * The private key stays server-side; only logged-in sessions (token cookie)
 * may sign, so random sites cannot use us as a signature oracle for QZ Tray.
 *
 * TEMPORARILY DISABLED — browser print is the default.
 * To re-enable: remove the 503 early return below.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (true) {
    return new Response("QZ_DISABLED: QZ Tray printing is disabled, use browser print", { status: 503 });
  }
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const { token } = await parseCookieFromRequest(request);
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }
  let toSign: unknown;
  try {
    toSign = (await request.json())?.toSign;
  } catch {
    return new Response("Bad request: JSON { toSign } required", { status: 400 });
  }
  try {
    const signature = signQzRequest(toSign as string);
    return new Response(signature, { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.startsWith("QZ_SIGNING_BAD_REQUEST") ? 400 : 500;
    return new Response(message, { status });
  }
};
