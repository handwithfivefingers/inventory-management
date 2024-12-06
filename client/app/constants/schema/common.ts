import { z } from "zod";

export const StrOrNum = z.number().or(z.string());
