import { z } from "zod";
import { StrOrNum } from "./common";

export const staffSchema = z.object({
  code: z.string().optional(),
  fullName: z.string().min(1, "Name is required"),
  gender: z.enum(["male", "female", "other"]).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  position: z.string().default("other"),
  salary: StrOrNum.optional(),
  hireDate: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  address: z.string().optional(),
  userId: StrOrNum.optional(),
  warehouseId: StrOrNum.optional(),
});

export type IStaffType = z.infer<typeof staffSchema>;
