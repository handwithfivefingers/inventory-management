import { describe, it, expect } from "vitest";
import { dayjs } from "../date";

describe("dayjs (UTC extended)", () => {
  it("is a dayjs instance that can parse a date", () => {
    const instance = dayjs("2024-01-01T00:00:00Z");
    expect(instance.isValid()).toBe(true);
    expect(instance.format("YYYY")).toBe("2024");
  });

  it("formats dates using the vi-VN locale conventions", () => {
    const formatted = dayjs("2024-03-15T12:30:00Z").format("YYYY-MM-DD HH:mm");
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it("supports relative time helpers", () => {
    const future = dayjs().add(1, "day");
    expect(future.isAfter(dayjs())).toBe(true);
  });

  it("marks an unparseable date as invalid", () => {
    expect(dayjs("not-a-real-date").isValid()).toBe(false);
  });

  it("exposes the UTC plugin helpers", () => {
    expect(typeof dayjs.utc).toBe("function");
    expect(dayjs.utc("2024-01-01T00:00:00Z").format("YYYY-MM-DD")).toBe("2024-01-01");
  });
});
