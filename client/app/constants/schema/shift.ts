import { z } from "zod";
import { StrOrNum } from "./common";

export const shiftSchema = z.object({
  staffId: StrOrNum.optional(),
  warehouseId: StrOrNum.optional(),
  openingCash: StrOrNum.default("0"),
  closingCash: StrOrNum.optional(),
  note: z.string().optional(),
});

export type IShiftType = z.infer<typeof shiftSchema>;
