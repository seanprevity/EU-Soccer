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

export const getStandingsService = async (
  league: string,
  season: string,
): Promise<Standing[]> => {
  return await db
    .select()
    .from(standings)
    .where(and(eq(standings.season, season), eq(standings.league, league)));
};

export const getRecentTeamStandingsService = async (
  team: string,
): Promise<Standing | null> => {
  const [row] = await db
    .select()
    .from(standings)
    .where(and(eq(standings.name, team), eq(standings.type, "TOTAL")))
    .orderBy(desc(standings.season))
    .limit(1);
  return row ?? null;
};

export const getRecentTableStandingsService = async (
  team: string,
): Promise<Standing[]> => {
  // The league and season the team most recently played in, as a subquery
  const latest = db
    .select({ season: standings.season, league: standings.league })
    .from(standings)
    .where(and(eq(standings.name, team), eq(standings.type, "TOTAL")))
    .orderBy(desc(standings.season))
    .limit(1)
    .as("latest");

  // Every TOTAL row from that league and season
  return db
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
};

export const getTeamStandingsService = async (
  team1: string,
  team2: string,
): Promise<Standing[]> => {
  return await db
    .select()
    .from(standings)
    .where(
      and(
        eq(standings.season, curSeason),
        or(eq(standings.name, team1), eq(standings.name, team2)),
      ),
    );
};

export const getTeamsExpectedStandingsService = async (
  teams: string[],
): Promise<ExpectedStanding[]> => {
  const rows = await db
    .select({
      team: standings.name,
      expectedPosition: sql<number>`avg(${standings.position})`.mapWith(Number),
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

  const byTeam = new Map(rows.map((r) => [r.team, r]));
  return teams.map(
    (team) => byTeam.get(team) ?? { team, expectedPosition: null, seasons: 0 },
  );
};
