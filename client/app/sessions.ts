import { createCookieSessionStorage, LoaderFunctionArgs } from "@remix-run/node"; // or cloudflare/deno

type SessionData = {
  userId?: string | number;
  vendorId?: string | number;
  warehouseId?: string | number;
  warehouse?: string | number;
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
    encode: (v) => {
      console.log("Encode", v);
      return v;
    },
  },
});

const getSessionValues = async (cookie: string) => {
  const session = await getSession(cookie);
  return {
    userId: session.get("userId") as string,
    vendorId: session.get("vendorId") as string,
    warehouseId: session.get("warehouseId") as string,
    warehouse: session.get("warehouse") as string,
  };
};

const parseCookieFromRequest = async (request: LoaderFunctionArgs["request"]) => {
  const cookie = request.headers.get("cookie") as string;
  const session = await getSession(cookie);
  const sessionValue = await getSessionValues(cookie as string);
  return {
    ...sessionValue,
    cookie,
    session,
  };
};
export { getSession, commitSession, destroySession, getSessionValues, parseCookieFromRequest };
