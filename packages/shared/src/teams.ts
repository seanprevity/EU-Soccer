import { z } from "zod";

export const teamSchema = z.object({
  id: z.number().int(),
  teamName: z.string(),
});

export const teamNameQuerySchema = z.object({
  name: z.string().trim().min(1),
});

export type Team = z.infer<typeof teamSchema>;
export type TeamNameQuery = z.infer<typeof teamNameQuerySchema>;
