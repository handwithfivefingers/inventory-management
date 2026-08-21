import { describe, it, expect } from "vitest";
import { formatCurrency, formatNumber } from "../format-currency";

describe("formatCurrency", () => {
  it("formats a number with the default VND currency", () => {
    expect(formatCurrency(1000)).toBe("1.000₫");
  });

  it("formats a string number", () => {
    expect(formatCurrency("2500")).toBe("2.500₫");
  });

  it("respects a custom currency symbol", () => {
    expect(formatCurrency(1234, "$")).toBe("1.234$");
  });

  it("returns 0 with the currency when value is undefined", () => {
    expect(formatCurrency(undefined)).toBe("0₫");
  });

  it("returns 0 with the currency when value is null", () => {
    expect(formatCurrency(null)).toBe("0₫");
  });

  it("returns 0 with the currency when the value is not a number", () => {
    expect(formatCurrency("abc")).toBe("0₫");
  });

  it("formats negative numbers with a minus sign", () => {
    expect(formatCurrency(-1000)).toBe("-1.000₫");
  });

  it("formats decimal values using a comma as the decimal separator", () => {
    expect(formatCurrency(1234.5)).toBe("1.234,5₫");
  });

  it("appends a custom symbol directly after the number", () => {
    expect(formatCurrency(500, "USD")).toBe("500USD");
  });
});

describe("formatNumber", () => {
  it("formats a number with thousand separators", () => {
    expect(formatNumber(1234567)).toBe("1.234.567");
  });

  it("formats a string number", () => {
    expect(formatNumber("99")).toBe("99");
  });

  it("returns 0 for undefined", () => {
    expect(formatNumber(undefined)).toBe("0");
  });

  it("returns 0 for null", () => {
    expect(formatNumber(null)).toBe("0");
  });

  it("returns 0 for a non numeric string", () => {
    expect(formatNumber("not-a-number")).toBe("0");
  });

  it("formats negative numbers", () => {
    expect(formatNumber(-2500)).toBe("-2.500");
  });

  it("formats decimal numbers", () => {
    expect(formatNumber(1234.5)).toBe("1.234,5");
  });
});
