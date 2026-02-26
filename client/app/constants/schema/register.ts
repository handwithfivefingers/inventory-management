import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
const schema = z
  .object({
    email: z.string(),
    password: z.string(),
    confirmPassword: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    vendor: z.string(),
    warehouse: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"], // path of error
  });

export type registerSchema = z.infer<typeof schema>;
export const registerResolver = zodResolver(schema);
