import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { providerCreateValidation } from "../validate";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use(providerCreateValidation);
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

describe("providerCreateValidation", () => {
  it("passes a payload with a name through to the next handler", async () => {
    const res = await post({ name: "ACME" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("rejects a payload without a name with 400", async () => {
    const res = await post({ email: "a@b.com" });
    expect(res.status).toBe(400);
  });

  it("rejects an empty name with 400", async () => {
    const res = await post({ name: "" });
    expect(res.status).toBe(400);
  });

  it("rejects a request with no body", async () => {
    const res = await fetch(`${baseUrl}/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "",
    });
    expect(res.status).toBe(400);
  });
});
