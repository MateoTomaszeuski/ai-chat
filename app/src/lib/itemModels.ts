import z from "zod";

export const CreateItemSchema = z.object({
  name: z.string().min(1, "name required").max(200),
  quantity: z.number().int().positive().max(1_000).optional().default(1),
});

export const ItemRowSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  quantity: z.number().int(),
  created_at: z.coerce.string(),
});

export type Item = z.infer<typeof ItemRowSchema>;
