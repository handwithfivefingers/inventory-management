import { z } from "zod";
import { StrOrNum } from "./common";

export const financialSchema = z.object({
  type: z.enum(["revenue", "expense"]),
  category: z.string().default("other"),
  amount: StrOrNum,
  note: z.string().optional(),
  staffId: StrOrNum.optional(),
  warehouseId: StrOrNum.optional(),
  transactionDate: z.string().optional(),
});

export type IFinancialType = z.infer<typeof financialSchema>;
