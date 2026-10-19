import { z } from "zod";

// Events (jsonb "Events")
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

export type MatchEventKind = z.infer<typeof matchEventKindSchema>;
export type MatchEvent = z.infer<typeof matchEventSchema>;
export type LineupPlayer = z.infer<typeof lineupPlayerSchema>;
export type TeamLineup = z.infer<typeof teamLineupSchema>;
export type MatchLineups = z.infer<typeof matchLineupsSchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;
export type MatchStats = z.infer<typeof matchStatsSchema>;
export type MatchPreview = z.infer<typeof matchPreviewSchema>;
export type HomeAwayStats = z.infer<typeof homeAwayStatsSchema>;
