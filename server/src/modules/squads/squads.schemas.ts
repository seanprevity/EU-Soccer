import { squadTeamQuerySchema, topPlayersQuerySchema } from "@epl/shared";
import { RequestSchemas } from "../../middleware/validation";

export const getSquadSchemas = {
  query: squadTeamQuerySchema,
} satisfies RequestSchemas;

export const getTopPlayersSchemas = {
  query: topPlayersQuerySchema,
} satisfies RequestSchemas;
