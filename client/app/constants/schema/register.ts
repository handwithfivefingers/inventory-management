import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
const schema = z
  .object({
    email: z.string(),
    password: z.string(),
    confirmPassword: z.string(),
    fullName: z.string().optional(),
    vendor: z.string(),
    warehouse: z.string(),
    niche: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"], // path of error
  });

export type RegisterType = z.infer<typeof schema>;
export const registerSchema = zodResolver(schema);
