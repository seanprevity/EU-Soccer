import { z } from "zod";
import { leagueParamSchema } from "@epl/shared";
import type { RequestSchemas } from "../../middleware/validation";

const leagueQuery = z.object({ league: leagueParamSchema.optional() });

export const leagueJobSchemas = { query: leagueQuery } satisfies RequestSchemas;

export const importMatchesSchemas = {
  query: leagueQuery.extend({
    days: z.coerce.number().int().min(1).max(60).default(3), // how far back to look
  }),
} satisfies RequestSchemas;

export const backfillSchemas = {
  query: leagueQuery.extend({
    seasonsAgo: z.coerce.number().int().min(1).max(10).default(1), // 1 = last season
    refresh: z.stringbool().default(false), // true re-fetches matches already complete
  }),
} satisfies RequestSchemas;

export const imagesSchemas = {
  query: leagueQuery.extend({
    limit: z.coerce.number().int().min(1).max(500).default(100), // players per league
  }),
} satisfies RequestSchemas;
