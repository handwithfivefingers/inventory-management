import { z } from "zod";
import { StrOrNum } from "./common";
const productSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  skuCode: z.string().optional(),
  unit: z.string().optional(),
  categories: StrOrNum.optional(),
  tags: z.string().optional(),
  description: z.string().optional(),
  quantity: StrOrNum.optional(),
  costPrice: StrOrNum.optional(),
  regularPrice: StrOrNum.optional(),
  salePrice: StrOrNum.optional(),
  wholeSalePrice: StrOrNum.optional(),
  VAT: z.number().optional(),
  expiredAt: z.string().optional(),
});

export { productSchema };
