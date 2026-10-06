import {
  HomeAwayStats,
  MatchPreview,
  matchStats,
  odds,
  upcomingMatches,
} from "../../drizzle/schema";
import { db } from "../lib/db";
import { eq, or, and, lt, gt, desc, count, gte, inArray } from "drizzle-orm";
import { curSeason } from "../utils/map";
import {
  computeFormScore,
  computeTeamStats,
  get_standings,
  get_team_data,
  getHeadToHeadBias,
  poissonRandom,
} from "../utils/simulation";

export const PAGE_SIZE = 5;
export type MatchRow = typeof matchStats.$inferSelect;

type SimulationResult = {
  home_team: string;
  away_team: string;
  home_win_prob: number;
  draw_prob: number;
  away_win_prob: number;
  avg_goals_home: number;
  avg_goals_away: number;
  lambda_home: number;
  lambda_away: number;
  most_likely_score: string;
  most_likely_score_prob: number;
};

export const getMatchStatsService = async (id: number) => {
  return await db.select().from(matchStats).where(eq(matchStats.id, id));
};

export const getUpcomingMatchesService = async () => {
  const futureMatches = await db.select().from(upcomingMatches);
  return futureMatches;
};

export const getPastMatchesService = async (): Promise<MatchPreview[]> => {
  const today = new Date();
  today.setDate(today.getDate() - 7);
  today.setHours(0, 0, 0, 0);
  return await db
    .select({
      id: matchStats.id,
      espnId: matchStats.espnId,
      homeTeam: matchStats.homeTeam,
      awayTeam: matchStats.awayTeam,
      league: matchStats.league,
      matchDate: matchStats.matchDate,
      ftr: matchStats.ftr,
      fthg: matchStats.fthg,
      ftag: matchStats.ftag,
      hr: matchStats.hr,
      ar: matchStats.ar,
    })
    .from(matchStats)
    .where(gt(matchStats.matchDate, today.toISOString()));
};

export const getOddsService = async (id: number) => {
  return await db.select().from(odds).where(eq(odds.match, id));
};

export const getTeamMatchStatsService = async (team: string) => {
  const startDate = new Date(Date.UTC(Number(curSeason), 7, 1));
  const endDate = new Date(Date.UTC(Number(curSeason) + 1, 6, 1));
  return await db
    .select()
    .from(matchStats)
    .where(
      and(
        lt(matchStats.matchDate, endDate.toISOString()),
        gt(matchStats.matchDate, startDate.toISOString()),
        or(eq(matchStats.homeTeam, team), eq(matchStats.awayTeam, team)),
      ),
    );
};

export const getUpcomingMatchByIdService = async (id: number) => {
  return await db
    .select()
    .from(upcomingMatches)
    .where(eq(upcomingMatches.id, id));
};

export const getLast5MatchesService = async (
  team: string,
  page = 0,
): Promise<{ matches: MatchPreview[]; total: number }> => {
  const where = or(
    eq(matchStats.homeTeam, team),
    eq(matchStats.awayTeam, team),
  );

  const matches = await db
    .select({
      id: matchStats.id,
      espnId: matchStats.espnId,
      homeTeam: matchStats.homeTeam,
      awayTeam: matchStats.awayTeam,
      league: matchStats.league,
      matchDate: matchStats.matchDate,
      ftr: matchStats.ftr,
      fthg: matchStats.fthg,
      ftag: matchStats.ftag,
      hr: matchStats.hr,
      ar: matchStats.ar,
    })
    .from(matchStats)
    .where(where)
    .orderBy(desc(matchStats.matchDate))
    .limit(PAGE_SIZE)
    .offset(page * PAGE_SIZE);

  const [{ total }] = await db
    .select({ total: count() })
    .from(matchStats)
    .where(where);

  return { matches, total };
};

export const getRecentMatchesService = async (
  team: string,
  page: number,
): Promise<{ matches: MatchPreview[]; total: number }> => {
  const where = or(
    eq(matchStats.homeTeam, team),
    eq(matchStats.awayTeam, team),
  );

  const matches = await db
    .select({
      id: matchStats.id,
      espnId: matchStats.espnId,
      homeTeam: matchStats.homeTeam,
      awayTeam: matchStats.awayTeam,
      league: matchStats.league,
      matchDate: matchStats.matchDate,
      ftr: matchStats.ftr,
      fthg: matchStats.fthg,
      ftag: matchStats.ftag,
      hr: matchStats.hr,
      ar: matchStats.ar,
    })
    .from(matchStats)
    .where(where)
    .orderBy(desc(matchStats.matchDate))
    .limit(PAGE_SIZE)
    .offset(page * PAGE_SIZE);

  const [{ total }] = await db
    .select({ total: count() })
    .from(matchStats)
    .where(where);

  return { matches, total };
};

export const getLast5MatchStatsService = async (
  team: string,
  page = 0,
): Promise<{ matches: MatchRow[]; total: number }> => {
  const where = or(
    eq(matchStats.homeTeam, team),
    eq(matchStats.awayTeam, team),
  );

  const matches = await db
    .select()
    .from(matchStats)
    .where(where)
    .orderBy(desc(matchStats.matchDate))
    .limit(PAGE_SIZE)
    .offset(page * PAGE_SIZE);

  const [{ total }] = await db
    .select({ total: count() })
    .from(matchStats)
    .where(where);

  return { matches, total };
};

// Simulate a match using Monte Carlo
export const getSimulationService = async (
  homeTeam: string,
  awayTeam: string,
  season: string = curSeason,
  nSimulations: number = 10000,
): Promise<SimulationResult> => {
  // Fetch stats and standings
  const matches = await get_team_data(homeTeam, awayTeam);
  const teamStats = computeTeamStats(matches);
  const standingsRows = await get_standings(homeTeam, awayTeam, season);

  // Map standings by team name
  const standingsMap: Record<string, (typeof standingsRows)[0]> = {};
  for (const row of standingsRows) standingsMap[row.name] = row;

  const maxPoints = Math.max(...standingsRows.map((r) => r.points ?? 0), 1);
  const homePoints = (standingsMap[homeTeam].points ?? 0) / maxPoints;
  const awayPoints = (standingsMap[awayTeam].points ?? 0) / maxPoints;

  // Home/away form from standings (use total/home/away as needed)
  const homeHomeForm = standingsMap[homeTeam];
  const awayAwayForm = standingsMap[awayTeam];

  const homeFormScore = computeFormScore(standingsMap[homeTeam].form);
  const awayFormScore = computeFormScore(standingsMap[awayTeam].form);

  // Expected scoring rates
  let lamHome =
    (teamStats[homeTeam].avg_scored_home +
      teamStats[awayTeam].avg_conceded_away) /
    2;
  let lamAway =
    (teamStats[awayTeam].avg_scored_away +
      teamStats[homeTeam].avg_conceded_home) /
    2;

  // Adjust by points
  lamHome *= 1 + (homePoints - awayPoints) * 0.2;
  lamAway *= 1 + (awayPoints - homePoints) * 0.2;

  // Adjust by home/away form
  lamHome *=
    1 +
    ((homeHomeForm.points ?? 0) / ((homeHomeForm.played ?? 1) * 3) - 0.5) * 0.2;
  lamAway *=
    1 +
    ((awayAwayForm.points ?? 0) / ((awayAwayForm.played ?? 1) * 3) - 0.5) * 0.2;

  // Adjust by recent form
  lamHome *= 1 + (homeFormScore - awayFormScore) * 0.2;
  lamAway *= 1 + (awayFormScore - homeFormScore) * 0.2;

  // Head-to-head bias
  const h2hBias = await getHeadToHeadBias(homeTeam, awayTeam);
  lamHome *= 1 + h2hBias;
  lamAway *= 1 - h2hBias;

  // Run Monte Carlo simulations
  const goalsHome: number[] = [];
  const goalsAway: number[] = [];
  for (let i = 0; i < nSimulations; i++) {
    goalsHome.push(poissonRandom(lamHome));
    goalsAway.push(poissonRandom(lamAway));
  }

  // Compute probabilities and averages
  const homeWinProb =
    goalsHome.filter((g, i) => g > goalsAway[i]).length / nSimulations;
  const drawProb =
    goalsHome.filter((g, i) => g === goalsAway[i]).length / nSimulations;
  const awayWinProb =
    goalsHome.filter((g, i) => g < goalsAway[i]).length / nSimulations;
  const avgGoalsHome = goalsHome.reduce((a, b) => a + b, 0) / nSimulations;
  const avgGoalsAway = goalsAway.reduce((a, b) => a + b, 0) / nSimulations;

  const scoreCounts = new Map<string, number>();
  for (let i = 0; i < nSimulations; i++) {
    const key = `${goalsHome[i]}-${goalsAway[i]}`;
    scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);
  }
  const [mostLikelyScore, mostLikelyScoreCount] = [
    ...scoreCounts.entries(),
  ].reduce((a, b) => (b[1] > a[1] ? b : a));

  const mostLikelyScoreProb = mostLikelyScoreCount / nSimulations;

  return {
    home_team: homeTeam,
    away_team: awayTeam,
    home_win_prob: homeWinProb,
    draw_prob: drawProb,
    away_win_prob: awayWinProb,
    avg_goals_home: avgGoalsHome,
    avg_goals_away: avgGoalsAway,
    lambda_home: lamHome,
    lambda_away: lamAway,
    most_likely_score: mostLikelyScore,
    most_likely_score_prob: mostLikelyScoreProb,
  };
};

export const getHomeAwayMatchesService = async (
  homeTeam: string,
  awayTeam: string,
): Promise<{
  homeHome: HomeAwayStats[];
  homeAway: HomeAwayStats[];
  awayHome: HomeAwayStats[];
  awayAway: HomeAwayStats[];
}> => {
  const teams = [homeTeam, awayTeam];
  const rows = await db
    .select({
      id: matchStats.id,
      homeTeam: matchStats.homeTeam,
      awayTeam: matchStats.awayTeam,
      hst: matchStats.hst,
      ast: matchStats.ast,
      hxg: matchStats.hxg,
      axg: matchStats.axg,
      hposs: matchStats.hposs,
      aposs: matchStats.aposs,
    })
    .from(matchStats)
    .where(
      and(
        gte(matchStats.matchDate, `${curSeason}-07`),
        or(
          inArray(matchStats.homeTeam, teams),
          inArray(matchStats.awayTeam, teams),
        ),
      ),
    );

  return {
    homeHome: rows.filter((r) => r.homeTeam === homeTeam),
    homeAway: rows.filter((r) => r.awayTeam === homeTeam),
    awayHome: rows.filter((r) => r.homeTeam === awayTeam),
    awayAway: rows.filter((r) => r.awayTeam === awayTeam),
  };
};
