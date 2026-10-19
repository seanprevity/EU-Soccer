import { z } from "zod";

export const standingSchema = z.object({
  id: z.number().int(),
  league: z.string(),
  name: z.string(),
  season: z.string(),
  type: z.string(),
  position: z.number().int(),
  played: z.number().int(),
  won: z.number().int(),
  draw: z.number().int(),
  lost: z.number().int(),
  goalsFor: z.number().int(),
  goalsAgainst: z.number().int(),
  goalDifference: z.number().int(),
  points: z.number().int(),
  form: z.string().nullable(),
  recentGf: z.number().int().nullable(),
  recentGa: z.number().int().nullable(),
});

export type Standing = z.infer<typeof standingSchema>;
