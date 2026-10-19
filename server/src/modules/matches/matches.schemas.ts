import {
  idParamsSchema,
  matchStatsQuerySchema,
  matchupQuerySchema,
  teamMatchesQuerySchema,
} from "@epl/shared";
import type { RequestSchemas } from "../../middleware/validation";

export const getMatchStatsSchemas = {
  query: matchStatsQuerySchema,
} satisfies RequestSchemas;

export const getUpcomingMatchByIdSchemas = {
  params: idParamsSchema,
} satisfies RequestSchemas;

export const getOddsSchemas = {
  params: idParamsSchema,
} satisfies RequestSchemas;

export const getTeamMatchesSchemas = {
  query: teamMatchesQuerySchema,
} satisfies RequestSchemas;

export const getMatchupSchemas = {
  query: matchupQuerySchema,
} satisfies RequestSchemas;
