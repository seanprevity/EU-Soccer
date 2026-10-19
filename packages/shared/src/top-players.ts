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

export type TopPlayer = z.infer<typeof topPlayerSchema>;
