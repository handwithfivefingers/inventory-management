import { z } from "zod";
import { StrOrNum } from "./common";
const attributeValueOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

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
  code: z.string().optional(),
  skuCode: StrOrNum.optional(),
  quantity: StrOrNum.optional(),
  costPrice: StrOrNum.refine(
    (v) => !isFinite(parseFloat(v as string)) && parseFloat(v as string) >= 0,
    "Cost price must be non-negative",
  ),
  regularPrice: StrOrNum.optional(),
  salePrice: StrOrNum.optional(),
  wholeSalePrice: StrOrNum.optional(),
  /** Allow negative stock for this specific combination (required choice) */
  isNegative: z.boolean().optional(),
  // New: references to global attributes
  attributes: z.array(StrOrNum).optional(),
  attributeValues: z.array(StrOrNum).optional(),
});

const productSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  skuCode: z.string().optional(),
  /** 0 = simple, 1 = variant, 2 = combo */
  type: StrOrNum.optional(),
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
});
export type ProductSchemaType = z.infer<typeof productSchema>;
export { productSchema };
