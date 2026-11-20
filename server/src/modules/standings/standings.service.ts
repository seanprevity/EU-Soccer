import { standings } from "../../../drizzle/schema";
import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  inArray,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { db } from "../../lib/db";
import { curSeason } from "../../config/map";
import { ExpectedStanding, Standing } from "@epl/shared";
import { withDbSpan, withSpan } from "../../lib/span";

export const getStandingsService = async (
  league: string,
  season: string,
): Promise<Standing[]> => {
  return await withSpan(
    "standings.getStandings",
    {
      "standings.league": league,
      "standings.season": season,
    },
    async () => {
      return await withDbSpan("standings", async (dbSpan) => {
        const results = await db
          .select()
          .from(standings)
          .where(
            and(eq(standings.season, season), eq(standings.league, league)),
          );
        dbSpan.setAttribute("db.response.returned_rows", results.length);
        return results;
      });
    },
  );
};

export const getRecentTeamStandingsService = async (
  team: string,
): Promise<Standing | null> => {
  return await withSpan(
    "standings.getRecentTeamStandings",
    { "standings.team": team },
    async (span) => {
      const [row] = await withDbSpan("standings", async (dbSpan) => {
        const result = await db
          .select()
          .from(standings)
          .where(and(eq(standings.name, team), eq(standings.type, "TOTAL")))
          .orderBy(desc(standings.season))
          .limit(1);
        dbSpan.setAttribute("db.response.returned_rows", result.length);
        return result;
      });
      span.setAttribute("standings.found", row !== undefined);
      return row ?? null;
    },
  );
};

export const getRecentTableStandingsService = async (
  team: string,
): Promise<Standing[]> => {
  return await withSpan(
    "standings.getRecentTableStandings",
    { "standings.team": team },
    async () => {
      // The league and season the team most recently played in, as a subquery
      const latest = db
        .select({ season: standings.season, league: standings.league })
        .from(standings)
        .where(and(eq(standings.name, team), eq(standings.type, "TOTAL")))
        .orderBy(desc(standings.season))
        .limit(1)
        .as("latest");

      // Every TOTAL row from that league and season
      return await withDbSpan("standings", async (dbSpan) => {
        const result = await db
          .select(getTableColumns(standings))
          .from(standings)
          .innerJoin(
            latest,
            and(
              eq(standings.season, latest.season),
              eq(standings.league, latest.league),
            ),
          )
          .where(eq(standings.type, "TOTAL"))
          .orderBy(asc(standings.position));
        dbSpan.setAttribute("db.response.returned_rows", result.length);
        return result;
      });
    },
  );
};

export const getTeamStandingsService = async (
  team1: string,
  team2: string,
): Promise<Standing[]> => {
  return await withSpan(
    "standings.getTeamStandings",
    {
      "standings.team1": team1,
      "standings.team2": team2,
      "standings.season": curSeason,
    },
    async () => {
      return await withDbSpan("standings", async (dbSpan) => {
        const result = await db
          .select()
          .from(standings)
          .where(
            and(
              eq(standings.season, curSeason),
              or(eq(standings.name, team1), eq(standings.name, team2)),
            ),
          );
        dbSpan.setAttribute("db.response.returned_rows", result.length);
        return result;
      });
    },
  );
};

export const getTeamsExpectedStandingsService = async (
  teams: string[],
): Promise<ExpectedStanding[]> => {
  return await withSpan(
    "standings.getTeamsExpectedStandings",
    {
      "standings.team_count": teams.length,
      "standings.before_season": curSeason,
    },
    async (span) => {
      const rows = await withDbSpan("standings", async (dbSpan) => {
        const result = await db
          .select({
            team: standings.name,
            expectedPosition: sql<number>`avg(${standings.position})`.mapWith(
              Number,
            ),
            seasons: sql<number>`count(*)`.mapWith(Number),
          })
          .from(standings)
          .where(
            and(
              inArray(standings.name, teams),
              eq(standings.type, "TOTAL"),
              lt(standings.season, curSeason),
            ),
          )
          .groupBy(standings.name);
        dbSpan.setAttribute("db.response.returned_rows", result.length);
        return result;
      });

      span.setAttribute("standings.teams_with_history", rows.length);

      const byTeam = new Map(rows.map((r) => [r.team, r]));
      return teams.map(
        (team) =>
          byTeam.get(team) ?? { team, expectedPosition: null, seasons: 0 },
      );
    },
  );
};
