import { z } from "zod";

export const playerSchema = z.object({
  name: z.string(),
  imageUrl: z.string().nullable(),
  imageCheckedAt: z.string().nullable(),
});

export type Player = z.infer<typeof playerSchema>;
