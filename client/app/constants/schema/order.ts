import { z } from "zod";
import { StrOrNum } from "./common";

const OrderDetails = z.object({
  productId: StrOrNum,
  quantity: StrOrNum,
  price: StrOrNum.optional(),
  buyPrice: StrOrNum.optional(),
  note: z.string().optional(),
  name: z.string().optional(),
  warehouseId: StrOrNum.optional(),
});

const orderSchema = z.object({
  OrderDetails: z.array(OrderDetails).optional(),
  price: StrOrNum.default("0"),
  VAT: StrOrNum.default("0"),
  surcharge: StrOrNum.default("0"),
  paid: StrOrNum.default("0"),
  paymentType: z.enum(["cash", "transfer"]).default("cash"),
  providerId:StrOrNum.optional(),
});

export { orderSchema };
