import {
  idParamsSchema,
  liveMatchQuerySchema,
  matchFilterOptionsQuerySchema,
  matchStatsQuerySchema,
  matchupQuerySchema,
  recentMatchesQuerySchema,
  upcomingLineupsParamsSchema,
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

export const getRecentMatchesSchemas = {
  query: recentMatchesQuerySchema,
} satisfies RequestSchemas;

export const getMatchFilterOptionsSchemas = {
  query: matchFilterOptionsQuerySchema,
} satisfies RequestSchemas;

export const getMatchupSchemas = {
  query: matchupQuerySchema,
} satisfies RequestSchemas;

export const getLiveMatchSchemas = {
  params: liveMatchQuerySchema,
} satisfies RequestSchemas;

export const getUpcomingLineupsSchemas = {
  params: upcomingLineupsParamsSchema,
} satisfies RequestSchemas;
