import { z } from "zod";

export const oddsSchema = z.object({
  bookmaker: z.string(),
  marketType: z.string(),
  // Postgres numeric columns come back from Drizzle as strings ("2.15"), so they're sent as strings
  oddsHome: z.string().nullable(),
  oddsDraw: z.string().nullable(),
  oddsAway: z.string().nullable(),
  updatedAt: z.string().nullable(),
  match: z.number().int().nullable(),
});

export type Odds = z.infer<typeof oddsSchema>;
