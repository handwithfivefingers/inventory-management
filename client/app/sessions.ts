// app/sessions.ts
import { createCookieSessionStorage } from "@remix-run/node"; // or cloudflare/deno
// import { IUser } from "./types/user";

type SessionData = string;

type SessionFlashData = {
  error: string;
};

const { getSession, commitSession, destroySession } = createCookieSessionStorage<SessionData, SessionFlashData>({
  // a Cookie from `createCookie` or the CookieOptions to create one
  cookie: {
    name: "session",
    secrets: [""],
    sameSite: "lax",
    encode: (v) => {
      console.log("Encode", v);
      return v;
    },
  },
});

export { getSession, commitSession, destroySession };
