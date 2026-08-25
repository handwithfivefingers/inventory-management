import { z } from "zod";
import { StrOrNum } from "./common";
import { zodResolver } from "@hookform/resolvers/zod";

const orderDetails = z.object({
  productId: StrOrNum,
  /** Optional: set when the line targets a specific product variant */
  variantId: StrOrNum.optional(),
  quantity: StrOrNum,
  price: StrOrNum.optional(),
  buyPrice: StrOrNum.optional(),
  note: z.string().optional(),
  name: z.string().optional(),
  warehouseId: StrOrNum.optional(),
});

const schema = z.object({
  orderDetails: z.array(orderDetails).optional(),
  price: StrOrNum.default("0"),
  VAT: StrOrNum.default("0"),
  surcharge: StrOrNum.default("0"),
  paid: StrOrNum.default("0"),
  paymentType: z.enum(["cash", "transfer"]).default("cash"),
  providerId: StrOrNum.optional(),
  customer: StrOrNum.optional(),
});

export type OrderSchema = z.infer<typeof schema>;
export type OrderDetailSchema = z.infer<typeof orderDetails>;
/** Raw zod schema (usable for `.parse()` / `.safeParse()` in tests and services). */
export const orderFormSchema = schema;
/** react-hook-form resolver for the order form. */
export const orderSchema = zodResolver(schema);
