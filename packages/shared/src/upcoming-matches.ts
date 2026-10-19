import { z } from "zod";

export const upcomingMatchSchema = z.object({
  id: z.number().int(),
  matchDate: z.string(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  league: z.string(),
});

export type UpcomingMatch = z.infer<typeof upcomingMatchSchema>;
