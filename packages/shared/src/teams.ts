import { z } from "zod";

export const teamSchema = z.object({
  id: z.number().int(),
  teamName: z.string(),
});

export type Team = z.infer<typeof teamSchema>;
