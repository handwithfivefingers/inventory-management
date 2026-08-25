import { describe, it, expect } from "vitest";
import { StrOrNum } from "../common";
import { loginSchema } from "../login";
import { registerSchema } from "../register";
import { tagSchema } from "../tag";
import { productSchema } from "../product";
import { shiftSchema } from "../shift";
import { financialSchema } from "../financial";
import { orderFormSchema } from "../order";
import { providerSchema, providerUpdateSchema } from "../provider";
import { warehouseSchema } from "../warehouse";
import { unitSchema } from "../units";
import { staffSchema } from "../staff";

describe("StrOrNum (common)", () => {
  it("accepts a number", () => {
    expect(StrOrNum.parse(5)).toBe(5);
  });
  it("accepts a string", () => {
    expect(StrOrNum.parse("5")).toBe("5");
  });
  it("rejects a boolean", () => {
    expect(StrOrNum.safeParse(true).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("parses a valid login payload", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "secret" });
    expect(result.success).toBe(true);
  });
  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "secret" });
    expect(result.success).toBe(false);
  });
  it("rejects a missing password", () => {
    const result = loginSchema.safeParse({ email: "a@b.com" });
    expect(result.success).toBe(false);
  });
  it("rejects a missing email", () => {
    const result = loginSchema.safeParse({ password: "secret" });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const options = { fields: {}, shouldUseNativeValidation: false } as const;

  it("accepts matching passwords", async () => {
    const result = await registerSchema(
      { email: "a@b.com", password: "p", confirmPassword: "p", vendor: "1", warehouse: "1" },
      {},
      options,
    );
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("rejects when passwords do not match", async () => {
    const result = await registerSchema(
      { email: "a@b.com", password: "p", confirmPassword: "q", vendor: "1", warehouse: "1" },
      {},
      options,
    );
    expect(result.errors.confirmPassword).toBeDefined();
  });

  it("rejects a missing vendor", async () => {
    const result = await registerSchema(
      { email: "a@b.com", password: "p", confirmPassword: "p", warehouse: "1" },
      {},
      options,
    );
    expect(result.errors.vendor).toBeDefined();
  });
  it("rejects a missing confirmPassword", async () => {
    const result = await registerSchema(
      { email: "a@b.com", password: "p", vendor: "1", warehouse: "1" },
      {},
      options,
    );
    expect(result.errors.confirmPassword).toBeDefined();
  });
});

describe("tagSchema", () => {
  it("parses a tag with a name", () => {
    expect(tagSchema.parse({ name: "sale" }).name).toBe("sale");
  });
  it("treats id as optional", () => {
    expect(tagSchema.parse({ name: "sale" }).id).toBeUndefined();
    expect(tagSchema.parse({ id: 1, name: "sale" }).id).toBe(1);
  });
  it("rejects an empty name", () => {
    expect(tagSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("productSchema", () => {
  it("requires a name", () => {
    expect(productSchema.safeParse({}).success).toBe(false);
  });
  it("accepts a number or string for unit/quantity/price fields", () => {
    const result = productSchema.safeParse({
      name: "Cola",
      unit: "box",
      quantity: "10",
      costPrice: 5,
      regularPrice: "9.5",
    });
    expect(result.success).toBe(true);
  });
  it("accepts optional relation arrays", () => {
    const result = productSchema.safeParse({ name: "Cola", categories: ["1", 2], tags: [3] });
    expect(result.success).toBe(true);
  });
  it("rejects a non-scalar quantity", () => {
    expect(productSchema.safeParse({ name: "Cola", quantity: { a: 1 } }).success).toBe(false);
  });
});

describe("shiftSchema", () => {
  it("defaults openingCash to '0'", () => {
    expect(shiftSchema.parse({}).openingCash).toBe("0");
  });
  it("accepts optional ids and cash values", () => {
    const result = shiftSchema.safeParse({ staffId: "1", warehouseId: 2, openingCash: 100 });
    expect(result.success).toBe(true);
  });
});

describe("financialSchema", () => {
  it("requires type to be revenue or expense", () => {
    expect(financialSchema.safeParse({ type: "revenue", amount: 10 }).success).toBe(true);
    expect(financialSchema.safeParse({ type: "refund", amount: 10 }).success).toBe(false);
  });
  it("accepts a string amount", () => {
    expect(financialSchema.safeParse({ type: "expense", amount: "50" }).success).toBe(true);
  });
});

describe("orderFormSchema", () => {
  it("defaults price, VAT, surcharge, paid and paymentType", () => {
    const parsed = orderFormSchema.parse({});
    expect(parsed.price).toBe("0");
    expect(parsed.VAT).toBe("0");
    expect(parsed.surcharge).toBe("0");
    expect(parsed.paid).toBe("0");
    expect(parsed.paymentType).toBe("cash");
  });
  it("validates orderDetails and paymentType", () => {
    const result = orderFormSchema.safeParse({
      paymentType: "transfer",
      orderDetails: [{ productId: "1", quantity: 2, price: "5" }],
    });
    expect(result.success).toBe(true);
    expect(orderFormSchema.safeParse({ paymentType: "bitcoin" }).success).toBe(false);
  });
  it("requires productId inside each order detail", () => {
    expect(orderFormSchema.safeParse({ orderDetails: [{ quantity: 2 }] }).success).toBe(false);
  });
});

describe("providerSchema", () => {
  it("requires a name", () => {
    expect(providerSchema.safeParse({}).success).toBe(false);
  });
  it("accepts optional email (valid) and phone/address", () => {
    const result = providerSchema.safeParse({ name: "ACME", email: "a@b.com", phone: "123" });
    expect(result.success).toBe(true);
  });
  it("rejects an invalid email when provided", () => {
    expect(providerSchema.safeParse({ name: "ACME", email: "bad" }).success).toBe(false);
  });
});

describe("providerUpdateSchema", () => {
  it("requires an id and a name", () => {
    expect(providerUpdateSchema.safeParse({ id: 1 }).success).toBe(false);
    expect(providerUpdateSchema.safeParse({ name: "ACME" }).success).toBe(false);
    expect(providerUpdateSchema.safeParse({ id: "1", name: "ACME" }).success).toBe(true);
  });
});

describe("warehouseSchema", () => {
  it("requires a name", () => {
    expect(warehouseSchema.safeParse({}).success).toBe(false);
    expect(warehouseSchema.safeParse({ name: "Main" }).success).toBe(true);
  });
  it("treats contact fields as optional", () => {
    expect(warehouseSchema.safeParse({ name: "Main", email: "", phone: "", address: "" }).success).toBe(true);
  });
});

describe("unitSchema", () => {
  it("requires a name", () => {
    expect(unitSchema.safeParse({}).success).toBe(false);
  });
  it("treats id as optional", () => {
    expect(unitSchema.parse({ name: "kg" }).id).toBeUndefined();
    expect(unitSchema.parse({ id: 2, name: "kg" }).id).toBe(2);
  });
});

describe("staffSchema", () => {
  it("requires a fullName", () => {
    expect(staffSchema.safeParse({}).success).toBe(false);
  });
  it("defaults position and status", () => {
    const parsed = staffSchema.parse({ fullName: "Jane" });
    expect(parsed.position).toBe("other");
    expect(parsed.status).toBe("active");
  });
  it("validates gender enum and email-or-empty", () => {
    expect(staffSchema.safeParse({ fullName: "Jane", gender: "female", email: "" }).success).toBe(true);
    expect(staffSchema.safeParse({ fullName: "Jane", gender: "x" }).success).toBe(false);
    expect(staffSchema.safeParse({ fullName: "Jane", email: "bad" }).success).toBe(false);
  });
});
