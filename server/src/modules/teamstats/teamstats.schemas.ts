import { teamStatsQuerySchema } from "@epl/shared";
import { RequestSchemas } from "../../middleware/validation";

export const getTeamStatsSchemas = {
  query: teamStatsQuerySchema,
} satisfies RequestSchemas;
