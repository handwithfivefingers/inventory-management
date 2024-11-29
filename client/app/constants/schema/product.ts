import { z } from "zod";
const productSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  skuCode: z.string().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().or(z.string()).optional(),
  productDetails: z.object({
    costPrice: z.number().or(z.string()).optional(),
    regularPrice: z.number().or(z.string()).optional(),
    salePrice: z.number().or(z.string()).optional(),
    wholeSalePrice: z.number().or(z.string()).optional(),
    VAT: z.number().optional(),
    expiredAt: z.string().optional(),
  }),
});

export { productSchema };
