import { standings } from "../../../drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../lib/db";
import { curSeason } from "../../config/map";
import {
  getLast5MatchStatsService,
  getTeamMatchStatsService,
} from "../matches/matches.service";
import { MatchStats, Standing, TeamStatsPair } from "@epl/shared";

function sumMatchStats(team: string, matches: MatchStats[]) {
  const totals = {
    shots: 0,
    shotsOnTarget: 0,
    oppShots: 0,
    oppShotsOnTarget: 0,
    corners: 0,
    yellows: 0,
    reds: 0,
    xg: 0,
    xga: 0,
    cleanSheets: 0,
    failedToScore: 0,
    possession: 0,
  };

  for (const match of matches) {
    const isHome = match.homeTeam === team;

    totals.shots += (isHome ? match.hs : match.as) ?? 0;
    totals.shotsOnTarget += (isHome ? match.hst : match.ast) ?? 0;
    totals.oppShots += (isHome ? match.as : match.hs) ?? 0;
    totals.oppShotsOnTarget += (isHome ? match.ast : match.hst) ?? 0;
    totals.corners += (isHome ? match.hc : match.ac) ?? 0;
    totals.yellows += (isHome ? match.hy : match.ay) ?? 0;
    totals.reds += (isHome ? match.hr : match.ar) ?? 0;
    totals.xg += (isHome ? match.hxg : match.axg) ?? 0;
    totals.xga += (isHome ? match.axg : match.hxg) ?? 0;
    totals.possession += (isHome ? match.hposs : match.aposs) ?? 0;

    const scored = isHome ? match.fthg : match.ftag;
    const conceded = isHome ? match.ftag : match.fthg;
    if (conceded === 0) totals.cleanSheets++;
    if (scored === 0) totals.failedToScore++;
  }

  return totals;
}

const calculateStats = (
  team: string,
  matches: MatchStats[],
  standing?: Standing,
) => ({
  name: standing?.name ?? team,
  won: standing?.won ?? 0,
  draw: standing?.draw ?? 0,
  lost: standing?.lost ?? 0,
  gf: standing?.goalsFor ?? 0,
  ga: standing?.goalsAgainst ?? 0,
  gd: standing?.goalDifference ?? 0,
  form: standing?.form ?? "",
  played: standing?.played ?? matches.length,
  ...sumMatchStats(team, matches),
});

const calculateLast5Stats = (team: string, matches: MatchStats[]) => {
  let won = 0;
  let draw = 0;
  let lost = 0;
  let gf = 0;
  let ga = 0;
  const form: string[] = [];

  for (const match of matches) {
    const isHome = match.homeTeam === team;
    const scored = (isHome ? match.fthg : match.ftag) ?? 0;
    const conceded = (isHome ? match.ftag : match.fthg) ?? 0;
    gf += scored;
    ga += conceded;

    if (scored > conceded) {
      won++;
      form.push("W");
    } else if (scored === conceded) {
      draw++;
      form.push("D");
    } else {
      lost++;
      form.push("L");
    }
  }

  return {
    name: team,
    won,
    draw,
    lost,
    gf,
    ga,
    gd: gf - ga,
    played: matches.length,
    form: form.reverse().join(""),
    ...sumMatchStats(team, matches),
  };
};

export const getSeasonTeamStatsService = async (
  team1: string,
  team2: string,
): Promise<TeamStatsPair> => {
  const [teamStandings, team1Matches, team2Matches] = await Promise.all([
    db
      .select()
      .from(standings)
      .where(
        and(
          eq(standings.season, curSeason),
          eq(standings.type, "TOTAL"),
          inArray(standings.name, [team1, team2]),
        ),
      ),
    getTeamMatchStatsService(team1),
    getTeamMatchStatsService(team2),
  ]);

  return [
    calculateStats(
      team1,
      team1Matches,
      teamStandings.find((s) => s.name === team1),
    ),
    calculateStats(
      team2,
      team2Matches,
      teamStandings.find((s) => s.name === team2),
    ),
  ];
};

export const getLast5TeamStatsService = async (
  team1: string,
  team2: string,
): Promise<TeamStatsPair> => {
  const [last5Team1, last5Team2] = await Promise.all([
    getLast5MatchStatsService(team1),
    getLast5MatchStatsService(team2),
  ]);

  return [
    calculateLast5Stats(team1, last5Team1.matches),
    calculateLast5Stats(team2, last5Team2.matches),
  ];
};
