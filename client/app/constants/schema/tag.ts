import { z } from "zod";
const tagSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
});
export type ITagSchema = z.infer<typeof tagSchema>;

export { tagSchema };
