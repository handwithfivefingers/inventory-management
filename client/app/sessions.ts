import { createCookieSessionStorage, LoaderFunctionArgs } from "@remix-run/node"; // or cloudflare/deno

type SessionData = {
  userId?: string | number;
  vendorId: string | number;
  warehouseId: string | number;
  token?: string;
};

type SessionFlashData = {
  error: string;
};

const { getSession, commitSession, destroySession } = createCookieSessionStorage<SessionData, SessionFlashData>({
  cookie: {
    name: "ss_storage",
    secrets: ["s3cret1"],
    sameSite: "lax",
  },
});

const getSessionValues = async (cookie: string) => {
  const session = await getSession(cookie);
  return {
    token: session.get("token") as string,
    userId: session.get("userId") as string,
    vendorId: session.get("vendorId") as string,
    warehouseId: session.get("warehouseId") as string,
  };
};

const parseCookieFromRequest = async (request: LoaderFunctionArgs["request"]) => {
  const cookie = request.headers.get("cookie") as string;
  const session = await getSession(cookie);
  const sessionValue = await getSessionValues(cookie as string);

  const newCookies = `session=${sessionValue.token};`;
  return {
    ...sessionValue,
    cookie: newCookies,
    session,
  };
};
export { getSession, commitSession, destroySession, getSessionValues, parseCookieFromRequest };
