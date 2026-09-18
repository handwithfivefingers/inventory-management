import { z } from "zod";
import { StrOrNum } from "./common";
const attributeValueOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const barcodeSchema = z
  .string()
  .regex(/^[A-Za-z0-9-]{1,12}$/, "Barcode must contain only letters, digits, and hyphens and be at most 12 characters")
  .or(z.literal(""));

const variantAttributeSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string(),
  // Reusable creatable option: each value is an object { label, value } instead of comma-parsed string
  values: z.preprocess((val) => {
    if (typeof val === "string") {
      return String(val)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((v) => ({ label: v, value: v }));
    }
    if (Array.isArray(val)) {
      return (val as any[])
        .map((v) => (typeof v === "string" ? { label: v, value: v } : v))
        .filter((v: any) => v?.value && v?.label);
    }
    return val;
  }, z.array(attributeValueOptionSchema).default([])),
});

/** Fields supported on each generated/selected variant - new schema uses ID arrays */
const variantOverrideSchema = z.object({
  /** Per-variant barcode (extends the parent product barcode; blank allowed) */
  code: barcodeSchema.optional(),
  skuCode: StrOrNum.optional(),
  quantity: StrOrNum.optional(),
  costPrice: StrOrNum.optional(),
  regularPrice: StrOrNum.optional(),
  salePrice: StrOrNum.optional(),
  wholeSalePrice: StrOrNum.optional(),
  VAT: StrOrNum.nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  /** Allow negative stock for this specific combination (required choice) */
  isNegative: z.boolean().optional(),
  isActive: z.boolean().optional(),
  // New: references to global attributes
  attributes: z.array(StrOrNum).optional(),
  attributeValues: z.array(StrOrNum).optional(),
});

const productSchema = z
  .object({
    name: z.string().min(1),
    code: barcodeSchema.optional(),
    skuCode: z.string().optional(),
    /** 0 = simple, 1 = variant, 2 = combo */
    type: z.number().min(0).max(2).default(0),
    unit: StrOrNum.optional(),
    categories: z.array(StrOrNum).optional(),
    tags: z.array(StrOrNum).optional(),
    description: z.string().or(z.null()).optional(),
    quantity: StrOrNum.optional(),
    costPrice: StrOrNum.optional(),
    regularPrice: StrOrNum.optional(),
    salePrice: StrOrNum.optional(),
    wholeSalePrice: StrOrNum.optional(),
    VAT: StrOrNum.optional(),
    expiredAt: z.string().optional(),
    isNegative: z.boolean().optional(),
    image: z.string().optional(),
    /** Attribute matrix for variable products (see VariantEditor) */
    variantAttributes: z.array(variantAttributeSchema).optional(),
    /** Variant cards: option picks + per-variant fields (see VariantEditor) */
    variants: z
      .array(
        variantOverrideSchema.extend({
          variantId: StrOrNum.optional(),
          options: z.record(z.string()),
        }),
      )
      .optional(),
  })
  .refine(
    // Hàm callback trả về true nếu dữ liệu hợp lệ
    (v) => v.isNegative || Number(v.quantity) > 0,
    {
      message: "Quantity must be > 0",
      path: ["quantity"], // Đẩy lỗi vào trường quantity
    },
  );
export type ProductSchemaType = z.infer<typeof productSchema>;
export { productSchema };
