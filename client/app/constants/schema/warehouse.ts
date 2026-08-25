import { z } from "zod";

const warehouseSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type WarehouseSchema = z.infer<typeof warehouseSchema>;

export { warehouseSchema };
export type { WarehouseSchema };
