import { createCookieSessionStorage } from "@remix-run/node"; // or cloudflare/deno

type SessionData = {
  userId?: string | number;
  vendorId: string | number;
  warehouseId: string | number;
};

type SessionFlashData = {
  error: string;
};

const { getSession, commitSession, destroySession } = createCookieSessionStorage<SessionData, SessionFlashData>({
  // a Cookie from `createCookie` or the CookieOptions to create one
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

export { getSession, commitSession, destroySession };
