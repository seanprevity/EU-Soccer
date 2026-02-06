import { eq } from "drizzle-orm";
import { squad } from "../../drizzle/schema";
import { db } from "../lib/db";

export const getSquadService = async (team: string) => {
  return await db.select().from(squad).where(eq(squad.team, team));
};
