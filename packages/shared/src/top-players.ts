import { z } from "zod";

// Leaderboard names, as used in the URL.
export const topPlayerCategorySchema = z.enum([
  "goals",
  "assists",
  "saves",
  "yellow_cards",
  "red_cards",
]);
export type TopPlayerCategory = z.infer<typeof topPlayerCategorySchema>;

// Leaderboard name -> squad column it's ranked by.
export const TOP_PLAYER_CATEGORIES = {
  goals: "goals",
  assists: "assists",
  saves: "saves",
  yellow_cards: "yellowCards",
  red_cards: "redCards",
} as const satisfies Record<TopPlayerCategory, string>;

export const isTopPlayerCategory = (c: string): c is TopPlayerCategory =>
  topPlayerCategorySchema.safeParse(c).success;

export const topPlayerSchema = z.object({
  player: z.string(),
  value: z.number().int(),
  category: z.string(),
  appearances: z.number().int().nullable(),
  season: z.string(),
  team: z.string(),
  league: z.string().nullable(),
  imageUrl: z.string().nullable(),
});

export const topPlayersQuerySchema = z.object({
  league: z.enum([
    "Bundesliga",
    "La Liga",
    "Ligue 1",
    "Premier League",
    "Serie A",
  ]),
  season: z.string().regex(/^\d{4}$/, "season must be a year like 2026"),
  category: topPlayerCategorySchema.default("goals"),
});

// One row of a leaderboard: what getTopPlayersService selects.
export const topPlayerEntrySchema = topPlayerSchema.pick({
  player: true,
  team: true,
  value: true,
  appearances: true,
  imageUrl: true,
});

export type TopPlayer = z.infer<typeof topPlayerSchema>;
export type TopPlayersQuery = z.infer<typeof topPlayersQuerySchema>;
export type TopPlayerEntry = z.infer<typeof topPlayerEntrySchema>;
