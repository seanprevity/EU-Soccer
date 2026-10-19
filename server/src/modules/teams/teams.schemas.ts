import { teamNameQuerySchema } from "@epl/shared";
import { RequestSchemas } from "../../middleware/validation";

export const getTeamByNameSchemas = {
  query: teamNameQuerySchema,
} satisfies RequestSchemas;

export const getLeagueByTeamSchemas = {
  query: teamNameQuerySchema,
} satisfies RequestSchemas;
