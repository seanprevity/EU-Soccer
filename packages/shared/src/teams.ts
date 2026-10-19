import { z } from "zod";

export const teamSchema = z.object({
  id: z.number().int(),
  teamName: z.string(),
});

export const teamNameQuerySchema = z.object({
  name: z.string().trim().min(1),
});

export const teamStatsSchema = z.object({
  name: z.string(),
  played: z.number().int(),
  won: z.number().int(),
  draw: z.number().int(),
  lost: z.number().int(),
  gf: z.number().int(), // goals for
  ga: z.number().int(), // goals against
  gd: z.number().int(), // goal difference
  xg: z.number(), // total expected goals (not an integer)
  shots: z.number().int(),
  shotsOnTarget: z.number().int(),
  corners: z.number().int(),
  yellows: z.number().int(),
  reds: z.number().int(),
  form: z.string(), // "WWDLW", most recent last
});

export const teamStatsPairSchema = z.tuple([teamStatsSchema, teamStatsSchema]);

export const teamStatsQuerySchema = z
  .object({
    team1: z.string().trim().min(1),
    team2: z.string().trim().min(1),
  })
  .refine((q) => q.team1 !== q.team2, {
    error: "team 1 must be different from team 2",
    path: ["team2"],
  });

export type Team = z.infer<typeof teamSchema>;
export type TeamNameQuery = z.infer<typeof teamNameQuerySchema>;
export type TeamStats = z.infer<typeof teamStatsSchema>;
export type TeamStatsPair = z.infer<typeof teamStatsPairSchema>;
export type TeamStatsQuery = z.infer<typeof teamStatsQuerySchema>;
