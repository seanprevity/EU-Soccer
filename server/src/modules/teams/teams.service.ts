import { League, Team } from "@epl/shared";
import { leagues, standings, teams } from "../../../drizzle/schema";
import { db } from "../../lib/db";
import { eq, getTableColumns, desc } from "drizzle-orm";

export const getTeamByNameService = async (
  name: string,
): Promise<Team | null> => {
  const [row] = await db
    .select()
    .from(teams)
    .where(eq(teams.teamName, name))
    .limit(1);
  return row ?? null;
};

export const getLeagueByTeamService = async (
  name: string,
): Promise<League | null> => {
  const [row] = await db
    .select(getTableColumns(leagues))
    .from(standings)
    .innerJoin(leagues, eq(leagues.name, standings.league))
    .where(eq(standings.name, name))
    .orderBy(desc(standings.season))
    .limit(1);
  return row ?? null;
};
