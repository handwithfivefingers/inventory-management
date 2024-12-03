// app/sessions.ts
import { createCookieSessionStorage } from "@remix-run/node"; // or cloudflare/deno
import { IUser } from "./types/user";

type SessionData = {
  warehouse: string | number;
  vendor: string | number;
  token: string;
  user?: IUser;
};

type SessionFlashData = {
  error: string;
};

const { getSession, commitSession, destroySession } = createCookieSessionStorage<SessionData, SessionFlashData>({
  // a Cookie from `createCookie` or the CookieOptions to create one
  cookie: {
    name: "__session",
    secrets: ["r3m1xr0ck5"],
    sameSite: "lax",
  },
});

export { getSession, commitSession, destroySession };
