import { describe, it, expect } from "vitest";
import { ERROR } from "#/constant/message";

describe("ERROR messages", () => {
  it("exposes the expected error keys", () => {
    expect(Object.keys(ERROR).sort()).toEqual([
      "BAD_REQUEST",
      "FORBIDDEN",
      "UNAUTHORIZED",
      "USR_NOT_FOUND",
      "USR_NOT_VALID",
    ]);
  });

  it("has the expected message text", () => {
    expect(ERROR.USR_NOT_VALID).toBe("User or password not valid");
    expect(ERROR.USR_NOT_FOUND).toBe("User not found");
    expect(ERROR.FORBIDDEN).toBe("Forbidden");
    expect(ERROR.UNAUTHORIZED).toBe("Unauthorized");
    expect(ERROR.BAD_REQUEST).toBe("Bad request");
  });

  it("exposes only non-empty string messages", () => {
    Object.values(ERROR).forEach((message) => {
      expect(typeof message).toBe("string");
      expect(message.length).toBeGreaterThan(0);
    });
  });
});
