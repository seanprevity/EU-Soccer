import { z } from "zod";

export const leagueSchema = z.object({
  name: z.string(),
  country: z.string().nullable(),
});

export const LEAGUES = [
  "Bundesliga",
  "La Liga",
  "Ligue 1",
  "Premier League",
  "Serie A",
] as const;
export const leagueNameSchema = z.enum(LEAGUES);

export const leagueParamSchema = z
  .string()
  .transform((s) => s.replace(/_/g, " ").trim())
  .pipe(leagueNameSchema);

export type League = z.infer<typeof leagueSchema>;
export type LeagueName = z.infer<typeof leagueNameSchema>;
