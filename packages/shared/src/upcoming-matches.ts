import { z } from "zod";
import { matchLineupsSchema, teamLineupSchema } from "./match-stats";

export const previousLineupSchema = z.object({
  lineup: teamLineupSchema,
  matchId: z.number(),
  matchDate: z.string(),
  opponent: z.string(),
  wasHome: z.boolean(),
});

export const upcomingLineupsSchema = z.object({
  confirmed: matchLineupsSchema.nullable().optional(),
  home: previousLineupSchema.nullable(),
  away: previousLineupSchema.nullable(),
});

export const upcomingMatchSchema = z.object({
  id: z.number().int(),
  matchDate: z.string(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  league: z.string(),
  lineups: matchLineupsSchema.nullable().optional(),
});

export const upcomingLineupsParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type UpcomingMatch = z.infer<typeof upcomingMatchSchema>;
export type PreviousLineup = z.infer<typeof previousLineupSchema>;
export type UpcomingLineups = z.infer<typeof upcomingLineupsSchema>;
