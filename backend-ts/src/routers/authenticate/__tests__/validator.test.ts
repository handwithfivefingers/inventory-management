import { describe, it, expect, vi } from "vitest";
import { loginValidator } from "../validator";

const post = async (body: Record<string, unknown>) => {
  const req = { body } as any;
  const res = { status: vi.fn(), send: vi.fn() } as any;
  res.status.mockReturnValue(res);
  const next = vi.fn();
  await loginValidator(req, res, next);
  return { req, res, next };
};

describe("loginValidator", () => {
  it("passes a valid email + password through to the next handler", async () => {
    expect((await post({ email: "a@b.com", password: "secret" })).next).toHaveBeenCalledWith();
  });
  it("rejects an invalid email with field errors", async () => {
    const result = await post({ email: "not-an-email", password: "secret" });
    expect(result.res.status).toHaveBeenCalledWith(400);
    expect(result.res.send.mock.calls[0][0].errors).toEqual(expect.arrayContaining([expect.objectContaining({ path: "email" })]));
  });
  it("rejects a missing password with field errors", async () => {
    const result = await post({ email: "a@b.com" });
    expect(result.res.status).toHaveBeenCalledWith(400);
    expect(result.res.send.mock.calls[0][0].errors).toEqual(expect.arrayContaining([expect.objectContaining({ path: "password" })]));
  });
  it("rejects a missing email", async () => {
    expect((await post({ password: "secret" })).res.status).toHaveBeenCalledWith(400);
  });
  it("normalizes the email before accepting it", async () => {
    const result = await post({ email: "User@Example.COM", password: "secret" });
    expect(result.next).toHaveBeenCalledWith();
    expect(result.req.body.email).toBe("user@example.com");
  });
  it("reports both email and password when both are missing", async () => {
    const result = await post({});
    expect(result.res.send.mock.calls[0][0].errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "email" }), expect.objectContaining({ path: "password" })
    ]));
  });
});
