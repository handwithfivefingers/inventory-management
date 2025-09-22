import { z } from "zod";
import { StrOrNum } from "./common";
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
});
export type ProductSchemaType = z.infer<typeof productSchema>;
export { productSchema,  };
