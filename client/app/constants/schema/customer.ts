//  name: "",
//   phone: "",
//   email: "",
//   address: "",
//   taxCode: "",

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  taxCode: z.string().optional(),
});

export type CustomerSchema = z.infer<typeof schema>;
export const customerSchema = zodResolver(schema);
