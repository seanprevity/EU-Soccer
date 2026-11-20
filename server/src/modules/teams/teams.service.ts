import { League, Team } from "@epl/shared";
import { leagues, standings, teams } from "../../../drizzle/schema";
import { db } from "../../lib/db";
import { eq, getTableColumns, desc } from "drizzle-orm";
import { withDbSpan, withSpan } from "../../lib/span";

export const getTeamByNameService = async (
  name: string,
): Promise<Team | null> => {
  return await withSpan(
    "teams.getTeamByName",
    { "teams.name": name },
    async (span) => {
      const [row] = await withDbSpan("teams", async (dbSpan) => {
        const result = await db
          .select()
          .from(teams)
          .where(eq(teams.teamName, name))
          .limit(1);
        dbSpan.setAttribute("db.response.returned_rows", result.length);
        return result;
      });
      span.setAttribute("teams.found", row !== undefined);
      return row ?? null;
    },
  );
};

export const getLeagueByTeamService = async (
  name: string,
): Promise<League | null> => {
  return await withSpan(
    "teams.getLeagueByTeam",
    { "teams.name": name },
    async (span) => {
      const [row] = await withDbSpan("standings", async (dbSpan) => {
        const result = await db
          .select(getTableColumns(leagues))
          .from(standings)
          .innerJoin(leagues, eq(leagues.name, standings.league))
          .where(eq(standings.name, name))
          .orderBy(desc(standings.season))
          .limit(1);
        dbSpan.setAttribute("db.response.returned_rows", result.length);
        return result;
      });
      span.setAttribute("teams.league_found", row !== undefined);
      if (row) span.setAttribute("teams.league", row.name);
      return row ?? null;
    },
  );
};
