import { goalScorers, standings } from "../../drizzle/schema";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "../lib/db";
import { curSeason } from "../utils/map";

export const getStandingsService = async (league: string, season: string) => {
  return await db
    .select()
    .from(standings)
    .where(and(eq(standings.season, season), eq(standings.league, league)));
};

export const getGoalScorersService = async (league: string, season: string) => {
  return await db
    .select()
    .from(goalScorers)
    .where(and(eq(goalScorers.league, league), eq(goalScorers.season, season)));
};

export const getTeamStandingsService = async (team1: string, team2: string) => {
  return await db
    .select()
    .from(standings)
    .where(
      and(
        eq(standings.season, curSeason),
        or(eq(standings.name, team1), eq(standings.name, team2))
      )
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
        eq(standings.type, "TOTAL")
      )
    );
};
