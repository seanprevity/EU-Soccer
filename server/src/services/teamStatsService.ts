import { standings } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import { curSeason } from "../utils/map";
import {
  getLast5MatchesService,
  getTeamMatchStatsService,
} from "./matchService";
import { matchStats } from "../../drizzle/schema";

// Helper to calculate aggregate stats
const calculateStats = (
  team: string,
  matches: (typeof matchStats.$inferSelect)[],
  standing?: typeof standings.$inferSelect
) => {
  let shots = 0;
  let shotsOnTarget = 0;
  let corners = 0;
  let yellows = 0;
  let reds = 0;

  for (const match of matches) {
    const isHome = match.homeTeam === team;
    corners += isHome ? match.hc ?? 0 : match.ac ?? 0;
    yellows += isHome ? match.hy ?? 0 : match.ay ?? 0;
    reds += isHome ? match.hr ?? 0 : match.ar ?? 0;

    if (isHome) {
      shots += match.hs ?? 0;
      shotsOnTarget += match.hst ?? 0;
    } else if (match.awayTeam === team) {
      shots += match.as ?? 0;
      shotsOnTarget += match.ast ?? 0;
    }
  }

  const result = {
    name: standing?.name ?? team,
    won: standing?.won ?? 0,
    draw: standing?.draw ?? 0,
    lost: standing?.lost ?? 0,
    gf: standing?.goalsFor ?? 0,
    ga: standing?.goalsAgainst ?? 0,
    gd: standing?.goalDifference ?? 0,
    shots,
    shotsOnTarget,
    corners,
    yellows,
    reds,
    form: standing?.form ?? "",
    played: standing?.played ?? matches.length,
  };

  return result;
};

const calculateLast5Stats = (
  team: string,
  matches: (typeof matchStats.$inferSelect)[]
) => {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let gf = 0;
  let ga = 0;
  let shots = 0;
  let shotsOnTarget = 0;
  let corners = 0;
  let yellows = 0;
  let reds = 0;

  for (const match of matches) {
    const isHome = match.homeTeam === team;

    gf += isHome ? match.fthg ?? 0 : match.ftag ?? 0;
    ga += isHome ? match.ftag ?? 0 : match.fthg ?? 0;
    yellows += isHome ? match.hy ?? 0 : match.ay ?? 0;
    reds += isHome ? match.hr ?? 0 : match.ar ?? 0;
    corners += isHome ? match.hc ?? 0 : match.ac ?? 0;

    if (match.ftr === "H" && isHome) wins++;
    else if (match.ftr === "A" && !isHome) wins++;
    else if (match.ftr === "D") draws++;
    else losses++;

    shots += isHome ? match.hs ?? 0 : match.as ?? 0;
    shotsOnTarget += isHome ? match.hst ?? 0 : match.ast ?? 0;
  }

  return {
    name: team,
    won: wins,
    draw: draws,
    lost: losses,
    gf,
    ga,
    gd: gf - ga,
    shots,
    shotsOnTarget,
    corners,
    reds,
    yellows,
    played: matches.length,
    form: matches
      .map((m) => {
        const isHome = m.homeTeam === team;
        if (m.ftr === "H" && isHome) return "W";
        if (m.ftr === "A" && !isHome) return "W";
        if (m.ftr === "D") return "D";
        return "L";
      })
      .reverse()
      .join(""),
  };
};

export const getSeasonTeamStatsService = async (
  team1: string,
  team2: string
) => {
  // Get standings info for both teams (where type === "TOTAL")
  const [team1Standing] = await db
    .select()
    .from(standings)
    .where(
      and(
        eq(standings.season, curSeason),
        eq(standings.name, team1),
        eq(standings.type, "TOTAL")
      )
    );

  const [team2Standing] = await db
    .select()
    .from(standings)
    .where(
      and(
        eq(standings.season, curSeason),
        eq(standings.name, team2),
        eq(standings.type, "TOTAL")
      )
    );

  // Get all matches for this season for both teams
  const team1Matches = await getTeamMatchStatsService(team1);
  const team2Matches = await getTeamMatchStatsService(team2);

  return [
    calculateStats(team1, team1Matches, team1Standing),
    calculateStats(team2, team2Matches, team2Standing),
  ];
};

export const getLast5TeamStatsService = async (
  team1: string,
  team2: string
) => {
  const last5Team1 = await getLast5MatchesService(team1);
  const last5Team2 = await getLast5MatchesService(team2);

  return [
    calculateLast5Stats(team1, last5Team1),
    calculateLast5Stats(team2, last5Team2),
  ];
};
