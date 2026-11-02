import { z } from "zod";
import { matchLineupsSchema, teamLineupSchema } from "./match-stats";

export const previousLineupSchema = z.object({
  lineup: teamLineupSchema,
  matchId: z.number(),
  matchDate: z.string(),
  opponent: z.string(),
  wasHome: z.boolean(),
});

const playerCountSchema = z.object({
  name: z.string(),
  count: z.number(),
  jersey: z.string().nullable(),
});

const formationCountSchema = z.object({ name: z.string(), count: z.number() });

export const teamPreviewSchema = z.object({
  team: z.string(),
  previous: previousLineupSchema.nullable(),
  lineupMatches: z.number(), // number of matches where we have lineups
  formations: z.array(formationCountSchema),
  scorers: z.array(playerCountSchema),
  assisters: z.array(playerCountSchema),
  yellowCards: z.array(playerCountSchema),
  redCards: z.array(playerCountSchema),
});

export const upcomingLineupsSchema = z.object({
  confirmed: matchLineupsSchema.nullable().optional(),
  home: teamPreviewSchema,
  away: teamPreviewSchema,
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
export type PlayerCount = z.infer<typeof playerCountSchema>;
export type TeamPreview = z.infer<typeof teamPreviewSchema>;
