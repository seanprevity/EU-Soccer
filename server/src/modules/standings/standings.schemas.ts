import {
  expectedStandingsQuerySchema,
  recentStandingsQuerySchema,
  standingsQuerySchema,
  teamStandingsQuerySchema,
} from "@epl/shared";
import { RequestSchemas } from "../../middleware/validation";

export const getStandingsSchemas = {
  query: standingsQuerySchema,
} satisfies RequestSchemas;

export const getRecentStandingsSchemas = {
  query: recentStandingsQuerySchema,
} satisfies RequestSchemas;

export const getTeamStandingsSchemas = {
  query: teamStandingsQuerySchema,
} satisfies RequestSchemas;

export const getTeamsExpectedStandingsSchemas = {
  query: expectedStandingsQuerySchema,
} satisfies RequestSchemas;
