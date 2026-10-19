import {
  h2hMatchesQuerySchema,
  h2hQuerySchema,
  upcomingH2HQuerySchema,
} from "@epl/shared";
import type { RequestSchemas } from "../../middleware/validation";

// prevents routes/controller circular import
export const getH2HSchemas = { query: h2hQuerySchema } satisfies RequestSchemas;
export const getH2HMatchesSchemas = {
  query: h2hMatchesQuerySchema,
} satisfies RequestSchemas;
export const getUpcomingH2HSchemas = {
  query: upcomingH2HQuerySchema,
} satisfies RequestSchemas;
