import { z } from "zod";
import { halfStatsSchema, matchEventSchema, matchLineupsSchema } from "./match-stats";

export const liveMatchSchema = z.object({
  id: z.number().int(),
  espnId: z.string(),
  league: z.string(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  kickoff: z.string(),
  status: z.string().nullable(),
  period: z.string().nullable(),
  clock: z.string().nullable(),
  homeScore: z.number().int(),
  awayScore: z.number().int(),
  events: z.array(matchEventSchema).nullable(),
  lineups: matchLineupsSchema.nullable(),
  updatedAt: z.string().nullable(),
  hs: z.number().int().nullable(), // shots
  as: z.number().int().nullable(),
  hst: z.number().int().nullable(), // shots on target
  ast: z.number().int().nullable(),
  hc: z.number().int().nullable(), // corners
  ac: z.number().int().nullable(),
  hf: z.number().int().nullable(), // fouls
  af: z.number().int().nullable(),
  hy: z.number().int().nullable(), // yellow cards
  ay: z.number().int().nullable(),
  hr: z.number().int().nullable(), // red cards
  ar: z.number().int().nullable(),
  hxg: z.number().nullable(), // expected goals
  axg: z.number().nullable(),
  hposs: z.number().nullable(), // possession
  aposs: z.number().nullable(),
  hbs: z.number().int().nullable(), // blocked shots
  abs: z.number().int().nullable(),
  hsv: z.number().int().nullable(), // saves
  asv: z.number().int().nullable(),
  firstHalf: halfStatsSchema.nullable(),
});

// automatically generated, omit for insert type
export const newLiveMatchSchema = liveMatchSchema.omit({ id: true });

export const liveMatchQuerySchema = z.object({
  espnId: z.string().regex(/^\d+$/, "espnId must be numeric"),
});

export const liveMatchResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("live"), match: liveMatchSchema }),
  z.object({ status: z.literal("finished"), matchId: z.number() }),
]);

export type LiveMatchResponse = z.infer<typeof liveMatchResponseSchema>;
export type LiveMatch = z.infer<typeof liveMatchSchema>;
export type NewLiveMatch = z.infer<typeof newLiveMatchSchema>;
