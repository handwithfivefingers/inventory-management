import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { loginValidator } from "../validator";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use(loginValidator);
  app.use((_req, res) => res.status(200).json({ ok: true }));
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server?.close();
});

const post = (payload: unknown) =>
  fetch(`${baseUrl}/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

describe("loginValidator", () => {
  it("passes a valid email + password through to the next handler", async () => {
    const res = await post({ email: "a@b.com", password: "secret" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("rejects an invalid email with 400 and field errors", async () => {
    const res = await post({ email: "not-an-email", password: "secret" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { errors: { path: string }[] };
    expect(body.errors.some((e) => e.path === "email")).toBe(true);
  });

  it("rejects a missing password with 400 and field errors", async () => {
    const res = await post({ email: "a@b.com" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { errors: { path: string }[] };
    expect(body.errors.some((e) => e.path === "password")).toBe(true);
  });

  it("rejects a missing email with 400", async () => {
    const res = await post({ password: "secret" });
    expect(res.status).toBe(400);
  });

  it("normalizes the email before accepting it", async () => {
    const res = await post({ email: "User@Example.COM", password: "secret" });
    expect(res.status).toBe(200);
  });

  it("reports both email and password when both are missing", async () => {
    const res = await post({});
    expect(res.status).toBe(400);
    const body = (await res.json()) as { errors: { path: string }[] };
    expect(body.errors.some((e) => e.path === "email")).toBe(true);
    expect(body.errors.some((e) => e.path === "password")).toBe(true);
  });
});
