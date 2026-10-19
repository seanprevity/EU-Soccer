import { z } from "zod";

const count = z.number().int().nullable();

export const squadPlayerSchema = z.object({
  id: z.number().int(),
  player: z.string().nullable(),
  position: z.string().nullable(),
  number: count,
  team: z.string().nullable(),
  league: z.string().nullable(),
  espnId: z.string().nullable(),
  nationality: z.string().nullable(),
  nationalityCode: z.string().nullable(),
  flagUrl: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  heightIn: count,
  weightLbs: count,
  statsSeason: z.string().nullable(),
  appearances: count,
  subIns: count,
  goals: count,
  assists: count,
  ownGoals: count,
  shots: count,
  shotsOnTarget: count,
  yellowCards: count,
  redCards: count,
  foulsCommitted: count,
  foulsSuffered: count,
  offsides: count,
  saves: count,
  goalsConceded: count,
  updatedAt: z.string().nullable(),
});

export type SquadPlayer = z.infer<typeof squadPlayerSchema>;
