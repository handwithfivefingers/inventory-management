import { z } from "zod";
import { StrOrNum } from "./common";
import { zodResolver } from "@hookform/resolvers/zod";

export const staff = z
  .object({
    fullName: z.string().min(1, "Name is required"),
    code: z.string().optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    salary: StrOrNum.optional(),
    hireDate: z.string().optional(),
    status: z.enum(["active", "inactive"]).default("active"),
    address: z.string().optional(),
    userId: StrOrNum.optional(),
    warehouseId: StrOrNum.optional(),
    createAccount: z.boolean().optional().default(false),
    password: z.string().optional(),
    accountEmail: z.string().email().optional().or(z.literal("")),
    roleId: StrOrNum,
  })
  .superRefine((data, ctx) => {
    if (!data.roleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["roleId"],
        message: "Role is required to create account",
      });
    }
    if (data.createAccount) {
      const loginEmail = (data.accountEmail || data.email || "").trim();
      if (!loginEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["accountEmail"],
          message: "Email is required to create login",
        });
      }
      if (!data.password || data.password.length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: "Password must be at least 6 characters",
        });
      }
    }
  });

export type StaffSchema = z.infer<typeof staff>;
export const staffSchema = zodResolver(staff);
