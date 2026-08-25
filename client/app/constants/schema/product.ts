import { z } from "zod";
import { StrOrNum } from "./common";
const variantAttributeSchema = z.object({
  name: z.string(),
  values: z.string(), // comma-separated list, e.g. "Red, Blue"
});

/** Fields supported on each generated/selected variant */
const variantOverrideSchema = z.object({
  skuCode: StrOrNum.optional(),
  quantity: StrOrNum.optional(),
  costPrice: StrOrNum.optional(),
  regularPrice: StrOrNum.optional(),
  salePrice: StrOrNum.optional(),
  wholeSalePrice: StrOrNum.optional(),
  /** Allow negative stock for this specific combination (required choice) */
  isNegative: z.boolean().optional(),
});

const productSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  skuCode: z.string().optional(),
  unit: StrOrNum.optional(),
  categories: z.array(StrOrNum).optional(),
  tags: z.array(StrOrNum).optional(),
  description: z.string().or(z.null()).optional(),
  quantity: StrOrNum.optional(),
  costPrice: StrOrNum.optional(),
  regularPrice: StrOrNum.optional(),
  salePrice: StrOrNum.optional(),
  wholeSalePrice: StrOrNum.optional(),
  VAT: z.number().optional(),
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
export { productSchema,  };
