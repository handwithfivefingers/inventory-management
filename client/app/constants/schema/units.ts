import { z } from "zod";
import { StrOrNum } from "./common";
const unitSchema = z.object({
  name: z.string().min(1),
});

export { unitSchema };
