import { z } from "zod";

// Allow empty string for optional email, transform to undefined/empty
const optionalEmail = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Invalid email" });

const warehouseSchema = z.object({
  name: z.string().min(1, { message: "Tên kho hàng là bắt buộc" }),
  email: optionalEmail,
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  isMain: z.boolean().optional().default(false),
});

const warehouseUpdateSchema = warehouseSchema.extend({
  id: z.coerce.number().optional(),
});

type WarehouseSchema = z.infer<typeof warehouseSchema>;
type WarehouseUpdateSchema = z.infer<typeof warehouseUpdateSchema>;

export { warehouseSchema, warehouseUpdateSchema };
export type { WarehouseSchema, WarehouseUpdateSchema };
