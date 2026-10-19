import { z } from "zod";
import { leagueParamSchema } from "./leagues";

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

export const standingsQuerySchema = z.object({
  league: leagueParamSchema,
  season: z.string().regex(/^\d{4}$/, "season must be a year like 2026"),
});

export const recentStandingsQuerySchema = z.object({
  team: z.string().trim().min(1),
});

export const teamStandingsQuerySchema = z.object({
  team1: z.string().trim().min(1),
  team2: z.string().trim().min(1),
});

export const expectedStandingsQuerySchema = z.object({
  teams: z
    .string()
    .transform((s) =>
      s
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== ""),
    )
    .pipe(z.array(z.string()).min(1).max(30)),
});

export const expectedStandingSchema = z.object({
  team: z.string(),
  expectedPosition: z.number().nullable(),
  seasons: z.number().int().min(0),
});

export type Standing = z.infer<typeof standingSchema>;
export type StandingsQuery = z.infer<typeof standingsQuerySchema>;
export type RecentStandingsQuery = z.infer<typeof recentStandingsQuerySchema>;
export type TeamStandingsQuery = z.infer<typeof teamStandingsQuerySchema>;
export type ExpectedStandingsQuery = z.infer<
  typeof expectedStandingsQuerySchema
>;
export type ExpectedStanding = z.infer<typeof expectedStandingSchema>;
