import { z } from "zod";
const orderSchema = z.object({
  customer: z.string().optional(),
  OrderDetails: z
    .array(
      z
        .object({
          product: z.string(),
          quantity: z.number().or(z.string()),
          price: z.string(),
          note: z.string().optional(),
          total: z.string(),
          name: z.string().optional(),
        })
        .optional()
    )
    .optional(),
  price: z.string().default("0"),
  VAT: z.string().or(z.number()).default("0"),
  warehouse: z.string(),
  surcharge: z.string().default("0"),
  paid: z.string().default("0"),
  paymentType: z.enum(["cash", "transfer"]).default("cash"),
});

export { orderSchema };
