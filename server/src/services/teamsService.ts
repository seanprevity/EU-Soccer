import { leagues, standings, teams } from "../../drizzle/schema";
import { db } from "../lib/db";
import { eq, or, and, lt, gt, desc } from "drizzle-orm";

export const getTeamByIdService = async (name: string) => {
  return await db.select().from(teams).where(eq(teams.teamName, name));
};

export const getLeagueByTeamService = async (team: string) => {
  const teamStanding = await db
    .select()
    .from(standings)
    .where(and(eq(standings.name, team)));
  if (teamStanding.length === 0) return null;
  const standing = teamStanding[0];
  return await db
    .select()
    .from(leagues)
    .where(eq(leagues.name, standing.league));
};
