import { z } from "zod";
import { StrOrNum } from "./common";
const attributeValueOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const barcodeSchema = z.string().trim().max(12).optional();
const barcodeRowSchema = z.object({
  id: StrOrNum.optional(),
  barcode: barcodeSchema.nullable(),
  unitId: StrOrNum.nullable(),
  conversionRate: StrOrNum,
  costPrice: StrOrNum,
  retailPrice: StrOrNum,
  wholesalePrice: StrOrNum,
  promoPrice: StrOrNum.nullable().optional(),
  promoStartAt: z.string().nullable().optional(),
  promoEndAt: z.string().nullable().optional(),
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
const barcodeRowsSchema = z.array(barcodeRowSchema).min(1).superRefine((rows, ctx) => {
  if (rows.filter((row) => Number(row.conversionRate) === 1).length !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Each variant needs exactly one base unit (rate 1)" });
  }
  rows.forEach((row, index) => {
    const conversionRate = Number(row.conversionRate);
    if (!Number.isInteger(conversionRate) || conversionRate <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "conversionRate"], message: "Conversion rate must be a positive integer" });
    }
    const duplicateUnitAt = rows.findIndex((candidate, candidateIndex) => candidateIndex < index && String(candidate.unitId) === String(row.unitId));
    if (row.unitId != null && duplicateUnitAt !== -1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "unitId"], message: "This unit is already used in this variant" });
    }
    const barcode = String(row.barcode || "").trim().toUpperCase();
    const duplicateBarcodeAt = barcode ? rows.findIndex((candidate, candidateIndex) => candidateIndex < index && String(candidate.barcode || "").trim().toUpperCase() === barcode) : -1;
    if (duplicateBarcodeAt !== -1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "barcode"], message: "Barcode is duplicated in this product payload" });
    }
    const cost = Number(row.costPrice);
    const retail = Number(row.retailPrice);
    const wholesale = Number(row.wholesalePrice);
    if (Number.isFinite(cost) && Number.isFinite(retail) && retail < cost)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "retailPrice"], message: "Retail price must be at least cost price" });
    if (Number.isFinite(wholesale) && Number.isFinite(retail) && wholesale > retail)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "wholesalePrice"], message: "Wholesale price cannot exceed retail price" });
  });
});

const variantOverrideSchema = z.object({
  skuCode: StrOrNum.optional(),
  quantity: StrOrNum.optional(),
  barcodes: barcodeRowsSchema,
  VAT: StrOrNum.nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  /** Allow negative stock for this specific combination (required choice) */
  isNegative: z.boolean().optional(),
  isActive: z.boolean().optional(),
  // New: references to global attributes
  attributes: z.array(StrOrNum).optional(),
  attributeValues: z.array(StrOrNum).optional(),
});

const productSchema = z.object({
  name: z.string().min(1),
  skuCode: z.string().optional(),
  /** 0 = simple, 1 = variant, 2 = combo */
  type: z.number().min(0).max(2).default(0),
  unit: StrOrNum.optional(),
  categories: z.array(StrOrNum).optional(),
  tags: z.array(StrOrNum).optional(),
  description: z.string().or(z.null()).optional(),
  quantity: StrOrNum.optional(),
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
}).superRefine((product, ctx) => {
  const seen = new Set<string>();
  (product.variants || []).forEach((variant, variantIndex) => {
    (variant.barcodes || []).forEach((row, barcodeIndex) => {
      const barcode = String(row.barcode || "").trim().toUpperCase();
      if (!barcode) return;
      if (seen.has(barcode)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["variants", variantIndex, "barcodes", barcodeIndex, "barcode"], message: "Barcode is duplicated in this product payload" });
      }
      seen.add(barcode);
    });
  });
});
export type ProductSchemaType = z.infer<typeof productSchema>;
export { productSchema };
