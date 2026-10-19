import { z } from "zod";
import { matchPreviewSchema } from "./match-stats";
import { idListSchema } from "./common";

export const h2hSchema = z.object({
  team1: z.string(),
  team2: z.string(),
  mp: z.number().int().nullable(),
  team1Wins: z.number().int().nullable(),
  team2Wins: z.number().int().nullable(),
  draws: z.number().int().nullable(),
  last5: z.array(z.number().int()),
});

const teamPair = {
  team1: z.string().trim().min(1),
  team2: z.string().trim().min(1),
};

export const h2hQuerySchema = z
  .object(teamPair)
  .refine((q) => q.team1 !== q.team2, {
    error: "team1 and team2 must be different teams",
    path: ["team2"],
  });

export const h2hMatchesQuerySchema = z
  .object({
    ...teamPair,
    page: z.coerce.number().int().min(0).default(0),
  })
  .refine((q) => q.team1 !== q.team2, {
    error: "team1 and team2 must be different",
    path: ["team2"],
  });

export const h2hMatchesResponseSchema = z.object({
  matches: z.array(matchPreviewSchema),
});

export const upcomingH2HQuerySchema = z.object({
  ids: idListSchema,
});

export type H2HQuery = z.infer<typeof h2hQuerySchema>;
export type H2H = z.infer<typeof h2hSchema>;
export type H2HMatchesQuery = z.infer<typeof h2hMatchesQuerySchema>;
export type H2HMatchesResponse = z.infer<typeof h2hMatchesResponseSchema>;
export type UpcomingH2HQuery = z.infer<typeof upcomingH2HQuerySchema>;
