import { z } from "zod";

export const leagueSchema = z.object({
  name: z.string(),
  country: z.string().nullable(),
});

export type League = z.infer<typeof leagueSchema>;
