import { z } from "zod";

const providerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const providerUpdateSchema = providerSchema.extend({
  id: z.coerce.number(),
  description: z.string().optional(),
});

type ProviderSchema = z.infer<typeof providerSchema>;
type ProviderUpdateSchema = z.infer<typeof providerUpdateSchema>;

export { providerSchema, providerUpdateSchema };
export type { ProviderSchema, ProviderUpdateSchema };
