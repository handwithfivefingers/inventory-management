import { describe, it, expect } from "vitest";
import { cn, sanitize, getLoaderRequestQuery } from "../utils";

describe("cn", () => {
  it("merges class names with clsx + tailwind-merge", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional and object syntax", () => {
    expect(cn("a", false && "b", { c: true, d: false })).toBe("a c");
  });

  it("handles undefined arguments", () => {
    expect(cn("a", undefined)).toBe("a");
  });
});

describe("sanitize", () => {
  it("removes script tags", () => {
    const result = sanitize("<script>alert(1)</script><p>hi</p>");
    expect(result).not.toContain("<script>");
    expect(result).toContain("hi");
  });

  it("keeps safe markup", () => {
    expect(sanitize("<b>bold</b>")).toContain("<b>bold</b>");
  });
});

describe("getLoaderRequestQuery", () => {
  it("parses query params from a Request", () => {
    const request = new Request("http://localhost/products?page=2&pageSize=20");
    const query = getLoaderRequestQuery(request);
    expect(query.page).toBe("2");
    expect(query.pageSize).toBe("20");
  });

  it("defaults page and pageSize when missing", () => {
    const request = new Request("http://localhost/products");
    const query = getLoaderRequestQuery(request);
    expect(query.page).toBe("1");
    expect(query.pageSize).toBe("10");
  });

  it("captures arbitrary filters from the query string", () => {
    const request = new Request("http://localhost/orders?status=paid&q=abc");
    const query = getLoaderRequestQuery(request);
    expect(query.status).toBe("paid");
    expect(query.q).toBe("abc");
  });
});
