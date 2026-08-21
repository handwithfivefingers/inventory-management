import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { signToken, verifyToken, decodeToken } from "#/libs/token";

const SECRET = process.env.JWT_SECRET_KEY || "secret";

describe("signToken", () => {
  it("returns a JWT string with three segments", () => {
    const token = signToken({ id: 1, email: "a@b.com" });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });
});

describe("verifyToken", () => {
  it("verifies a token signed with the same secret", () => {
    const token = signToken({ id: 7, email: "a@b.com" });
    const decoded = verifyToken<{ id: number; email: string }>(token);
    expect(decoded).toMatchObject({ id: 7, email: "a@b.com" });
  });

  it("returns false for a malformed token", () => {
    expect(verifyToken("not-a-real-token")).toBe(false);
  });

  it("returns false for a token signed with a different secret", () => {
    const forged = jwt.sign({ id: 1 }, "other-secret", { expiresIn: 60 });
    expect(verifyToken(forged)).toBe(false);
  });

  it("returns false for an expired token", () => {
    const expired = jwt.sign({ id: 1, email: "a@b.com" }, SECRET, { expiresIn: -10 });
    expect(verifyToken(expired)).toBe(false);
  });

  it("preserves the typed payload on success", () => {
    const token = signToken({ id: 42, email: "a@b.com" });
    const decoded = verifyToken<{ id: number; email: string }>(token);
    expect(decoded).not.toBe(false);
    expect((decoded as { id: number }).id).toBe(42);
  });
});

describe("decodeToken", () => {
  it("decodes a valid token", async () => {
    const token = signToken({ id: 1, email: "a@b.com" });
    const decoded = (await decodeToken(token)) as { email: string };
    expect(decoded.email).toBe("a@b.com");
  });

  it("throws when the token cannot be decoded", async () => {
    await expect(decodeToken("garbage")).rejects.toThrow("Token invalid");
  });

  it("throws when the token is expired", async () => {
    const expired = jwt.sign(
      { id: 1, exp: Math.floor(Date.now() / 1000) - 10 },
      SECRET,
    );
    await expect(decodeToken(expired)).rejects.toThrow("Token expired");
  });

  it("throws when the token is an empty string", async () => {
    await expect(decodeToken("")).rejects.toThrow("Token invalid");
  });

  it("decodes a token that has no exp claim", async () => {
    const noExp = jwt.sign({ id: 5 }, SECRET);
    const decoded = (await decodeToken(noExp)) as { id: number };
    expect(decoded.id).toBe(5);
  });
});
