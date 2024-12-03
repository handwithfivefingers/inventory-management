import { z } from "zod";
export const registerSchema = z.object({
  email: z.string(),
  password: z.string(),
  confirmPassword: z.string(),
  nickname: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  vendor: z.string(),
  warehouse: z.string(),
});
