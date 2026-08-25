import { describe, it, expect, vi } from "vitest";
import {
  buildAttributeCombinations,
  buildVariantSku,
  buildVariantSkuWithTemplate,
  findOverride,
} from "#/utils/variant";

describe("buildAttributeCombinations", () => {
  it("returns an empty list without usable attributes", () => {
    expect(buildAttributeCombinations([])).toEqual([]);
    expect(buildAttributeCombinations([{ name: "Color", values: [] }])).toEqual(
      [],
    );
    expect(buildAttributeCombinations([null as any])).toEqual([]);
  });

  it("builds the cartesian product of attribute values", () => {
    const combos = buildAttributeCombinations([
      { name: "Color", values: ["Red", "Blue"] },
      { name: "Size", values: ["S", "M"] },
    ]);
    expect(combos).toEqual([
      { Color: "Red", Size: "S" },
      { Color: "Red", Size: "M" },
      { Color: "Blue", Size: "S" },
      { Color: "Blue", Size: "M" },
    ]);
  });

  it("ignores attributes without values", () => {
    const combos = buildAttributeCombinations([
      { name: "Color", values: ["Red"] },
      { name: "Empty", values: [] },
    ]);
    expect(combos).toEqual([{ Color: "Red" }]);
  });
});

describe("buildVariantSku", () => {
  it("appends sanitized option segments to the base SKU", () => {
    expect(buildVariantSku("PRD00001", { Color: "Red", Size: "XL" }, new Set())).toBe(
      "PRD00001-RED-XL",
    );
  });

  it("normalizes spaces and special characters", () => {
    expect(
      buildVariantSku("PRD00001", { Color: "dark blue" }, new Set()),
    ).toBe("PRD00001-DARK-BLUE");
  });

  it("returns the base SKU without options", () => {
    expect(buildVariantSku("PRD00001", {}, new Set())).toBe("PRD00001");
  });

  it("deduplicates collisions with a numeric suffix", () => {
    const taken = new Set(["PRD00001-RED", "PRD00001-RED-2"]);
    expect(buildVariantSku("PRD00001", { Color: "red" }, taken)).toBe(
      "PRD00001-RED-3",
    );
  });

  it("transliterates Vietnamese diacritics instead of dropping them", () => {
    expect(buildVariantSku("SP00001", { Màu: "Đỏ" }, new Set())).toBe(
      "SP00001-DO",
    );
    expect(buildVariantSku("SP00001", { Màu: "Trắng" }, new Set())).toBe(
      "SP00001-TRANG",
    );
  });
});

describe("buildVariantSkuWithTemplate", () => {
  it("falls back to the base SKU without a template", () => {
    expect(
      buildVariantSkuWithTemplate(undefined, "SP00001", { Color: "Red" }, new Set()),
    ).toBe("SP00001-RED");
  });

  it("resolves template tokens then appends attribute segments", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));
    expect(
      buildVariantSkuWithTemplate("{CODE}-{YYYY}", "SP00001", { Màu: "Trắng" }, new Set()),
    ).toBe("SP00001-2026-TRANG");
    vi.useRealTimers();
  });
});

describe("findOverride", () => {
  const overrides = [
    {
      optionValues: { color: "Red", size: "XL" },
      salePrice: 1000,
      quantity: 7,
    },
  ];

  it("matches case-insensitively on names and values", () => {
    expect(findOverride(overrides, { COLOR: "red", Size: "xl" })).toBe(
      overrides[0],
    );
  });

  it("returns undefined when keys differ", () => {
    expect(findOverride(overrides, { Color: "Red" })).toBeUndefined();
    expect(findOverride(undefined, { Color: "Red" })).toBeUndefined();
  });
});
