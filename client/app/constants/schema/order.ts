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
  /**
   * Per-line VAT %. Snapshot of `variant.VAT ?? product.VAT` taken when the
   * line is picked; omitted lines fall back to the header `VAT`.
   * Stored on the line so a later backend migration (orderDetails VAT column)
   * can persist it without payload changes.
   */
  VAT: StrOrNum.optional(),
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
  channel: z.enum(["POS", "WHOLESALE", "ONLINE"]).default("WHOLESALE"),
  providerId: StrOrNum.optional(),
  customer: StrOrNum.optional(),
});

export type OrderSchema = z.infer<typeof schema>;
export type OrderDetailSchema = z.infer<typeof orderDetails>;
/** Raw zod schema (usable for `.parse()` / `.safeParse()` in tests and services). */
export const orderFormSchema = schema;
/** react-hook-form resolver for the order form. */
export const orderSchema = zodResolver(schema);

/**
 * Import (inbound) orders must always carry a provider — the backend rejects
 * `POST /import-order` with 400 `providerId is required` otherwise.
 * The shared sales schema above keeps `providerId` optional, so import pages
 * must use this stricter variant.
 */
export const importOrderFormSchema = schema.extend({
  // `StrOrNum` alone would accept `""`; import orders need a real id.
  providerId: z.union([z.number(), z.string().min(1)], {
    required_error: "Required",
    invalid_type_error: "Required",
  }),
});
export type ImportOrderSchema = z.infer<typeof importOrderFormSchema>;
/** react-hook-form resolver for the import-order form (provider required). */
export const importOrderSchema = zodResolver(importOrderFormSchema);
