import { standings } from "../../drizzle/schema";
import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { curSeason } from "../utils/map";

export const getStandingsService = async (league: string, season: string) => {
  return await db
    .select()
    .from(standings)
    .where(and(eq(standings.season, season), eq(standings.league, league)));
};

export const getTeamStandingsService = async (team1: string, team2: string) => {
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

export const getRecentTeamStandingsService = async (team: string) => {
  return await db
    .select()
    .from(standings)
    .where(and(eq(standings.name, team), eq(standings.type, "TOTAL")))
    .orderBy(desc(standings.season))
    .limit(1);
};

export const getRecentTableStandingsService = async (team: string) => {
  const season = await db
    .select()
    .from(standings)
    .where(and(eq(standings.name, team), eq(standings.type, "TOTAL")))
    .orderBy(desc(standings.season))
    .limit(1);
  const recent = season[0];

  return await db
    .select()
    .from(standings)
    .where(
      and(
        eq(standings.season, recent.season),
        eq(standings.league, recent.league),
        eq(standings.type, "TOTAL"),
      ),
    );
};

export type ExpectedStanding = {
  team: string;
  expectedPosition: number | null;
  seasons: number;
};

export const getTeamsExpectedStandingsService = async (
  teams: string[],
): Promise<ExpectedStanding[]> => {
  if (!teams.length) return [];

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
