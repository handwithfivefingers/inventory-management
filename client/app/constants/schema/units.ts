import { z } from "zod";
const unitSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
});
export type IUnitSchema = z.infer<typeof unitSchema>;

export { unitSchema };
