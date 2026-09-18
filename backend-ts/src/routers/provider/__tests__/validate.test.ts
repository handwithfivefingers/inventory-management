import { describe, it, expect, vi } from "vitest";
import { providerCreateValidation } from "../validate";

const post = async (body: Record<string, unknown>) => {
  const req = { body } as any;
  const res = { status: vi.fn(), send: vi.fn() } as any;
  res.status.mockReturnValue(res);
  const next = vi.fn();
  await providerCreateValidation(req, res, next);
  return { res, next };
};

describe("providerCreateValidation", () => {
  it("passes a payload with a name through to the next handler", async () => {
    expect((await post({ name: "ACME" })).next).toHaveBeenCalledWith();
  });
  it.each([{ email: "a@b.com" }, { name: "" }, {} as Record<string, unknown>])(
    "rejects invalid payload %# with 400",
    async (body) => expect((await post(body)).res.status).toHaveBeenCalledWith(400),
  );
});
