import { z } from "zod";
import { idListSchema, pageSchema } from "./common";

export const matchEventKindSchema = z.enum([
  "goal",
  "penalty",
  "own_goal",
  "yellow",
  "red",
  "second_yellow",
  "sub",
]);

export const matchEventSchema = z.object({
  kind: matchEventKindSchema,
  side: z.enum(["home", "away"]).nullable(),
  minute: z.number().int().nullable(),
  extraMinute: z.number().int().nullable(), // stoppage time: 45+2 is minute 45, extraMinute 2
  player: z.string().nullable(), // for a sub, the player coming on
  playerOut: z.string().nullable().optional(), // only present on subs
  assist: z.string().nullable(),
});

// Lineups (jsonb "Lineups")
export const lineupPlayerSchema = z.object({
  espnId: z.string(),
  name: z.string(),
  shortName: z.string().nullable(),
  jersey: z.string().nullable(), // ESPN sends shirt numbers as strings
  position: z.string().nullable(), // "G", "CD-L", "AM-R", "SUB"...
  positionName: z.string().nullable(), // "Goalkeeper", "Center Left Defender"...
  formationPlace: z.number().int().nullable(), // 1-11 for starters, 0 for substitutes
  starter: z.boolean(),
  subbedIn: z.boolean(),
  subbedOut: z.boolean(),
  headshot: z.string().nullable(),
});

export const teamLineupSchema = z.object({
  formation: z.string().nullable(), // "4-2-3-1"
  players: z.array(lineupPlayerSchema),
});

export const matchLineupsSchema = z.object({
  home: teamLineupSchema,
  away: teamLineupSchema,
});

// Full-time result: home win, draw or away win.
export const matchResultSchema = z.enum(["H", "D", "A"]);

// stats to store by half
export const halfStatsSchema = z.object({
  hs: z.number().nullable(),
  as: z.number().nullable(),
  hst: z.number().int().nullable(),
  ast: z.number().int().nullable(),
  hc: z.number().int().nullable(),
  ac: z.number().int().nullable(),
  hf: z.number().int().nullable(),
  af: z.number().int().nullable(),
  hy: z.number().int().nullable(),
  ay: z.number().int().nullable(),
  hr: z.number().int().nullable(),
  ar: z.number().int().nullable(),
  hxg: z.number().nullable(),
  axg: z.number().nullable(),
  hposs: z.number().nullable(),
  aposs: z.number().nullable(),
  hbs: z.number().int().nullable(),
  abs: z.number().int().nullable(),
  hsv: z.number().int().nullable(),
  asv: z.number().int().nullable(),
});

export const matchStatsSchema = z.object({
  id: z.number().int(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  matchDate: z.string().nullable(),
  league: z.string(),
  espnId: z.string().nullable(),
  ftr: matchResultSchema.nullable(),
  fthg: z.number().int().nullable(), // full-time home goals
  ftag: z.number().int().nullable(), // full-time away goals
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
  events: z.array(matchEventSchema).nullable(),
  lineups: matchLineupsSchema.nullable(),
  firstHalf: halfStatsSchema.nullable().optional(),
});

// One match in a results list.
export const matchPreviewSchema = matchStatsSchema.pick({
  id: true,
  espnId: true,
  homeTeam: true,
  awayTeam: true,
  league: true,
  matchDate: true,
  ftr: true,
  fthg: true,
  ftag: true,
  hr: true,
  ar: true,
});

// The stats compared side by side for a match.
export const homeAwayStatsSchema = matchStatsSchema.pick({
  id: true,
  homeTeam: true,
  awayTeam: true,
  hst: true,
  ast: true,
  hxg: true,
  axg: true,
  hposs: true,
  aposs: true,
});

// A page of a team's matches, newest first, with the total for paging.
export const paginatedMatchesSchema = z.object({
  matches: z.array(matchPreviewSchema),
  total: z.number().int().min(0),
});

// Each team's home and away matches this season, for the side-by-side charts.
export const homeAwayMatchesSchema = z.object({
  homeHome: z.array(homeAwayStatsSchema), // home team, playing at home
  homeAway: z.array(homeAwayStatsSchema), // home team, playing away
  awayHome: z.array(homeAwayStatsSchema), // away team, playing at home
  awayAway: z.array(homeAwayStatsSchema), // away team, playing away
});

// Monte Carlo prediction for one fixture. Field names are snake_case, as the API has always sent them.
export const simulationResultSchema = z.object({
  home_team: z.string(),
  away_team: z.string(),
  home_win_prob: z.number(), // 0-1
  draw_prob: z.number(),
  away_win_prob: z.number(),
  avg_goals_home: z.number(),
  avg_goals_away: z.number(),
  lambda_home: z.number(), // expected goals used for the simulation
  lambda_away: z.number(),
  most_likely_score: z.string(), // "2-1"
  most_likely_score_prob: z.number(),
});

// /matches/stats?ids=12,15
export const matchStatsQuerySchema = z.object({ ids: idListSchema });

// /matches/last5
export const teamMatchesQuerySchema = z.object({
  team: z.string().trim().min(1),
  page: pageSchema,
});

// /matches/recent
export const recentMatchesQuerySchema = z.object({
  team: z.string(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

const teamNameParam = z
  .string()
  .transform((s) => s.replace(/_/g, " ").trim())
  .pipe(z.string().min(1));

// /matches/simulation and /matches/home-away
export const matchupQuerySchema = z
  .object({ homeTeam: teamNameParam, awayTeam: teamNameParam })
  .refine((q) => q.homeTeam !== q.awayTeam, {
    error: "homeTeam and awayTeam must be different teams",
    path: ["awayTeam"],
  });

export type MatchEventKind = z.infer<typeof matchEventKindSchema>;
export type MatchEvent = z.infer<typeof matchEventSchema>;
export type LineupPlayer = z.infer<typeof lineupPlayerSchema>;
export type TeamLineup = z.infer<typeof teamLineupSchema>;
export type MatchLineups = z.infer<typeof matchLineupsSchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;
export type MatchStats = z.infer<typeof matchStatsSchema>;
export type MatchPreview = z.infer<typeof matchPreviewSchema>;
export type HomeAwayStats = z.infer<typeof homeAwayStatsSchema>;
export type PaginatedMatches = z.infer<typeof paginatedMatchesSchema>;
export type HomeAwayMatches = z.infer<typeof homeAwayMatchesSchema>;
export type SimulationResult = z.infer<typeof simulationResultSchema>;
export type MatchStatsQuery = z.infer<typeof matchStatsQuerySchema>;
export type TeamMatchesQuery = z.infer<typeof teamMatchesQuerySchema>;
export type RecentMatchesQuery = z.infer<typeof recentMatchesQuerySchema>;
export type MatchupQuery = z.infer<typeof matchupQuerySchema>;
export type HalfStats = z.infer<typeof halfStatsSchema>;
