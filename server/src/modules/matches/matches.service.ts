import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  or,
} from "drizzle-orm";
import type {
  HomeAwayMatches,
  LiveMatch,
  MatchPreview,
  MatchStats,
  Odds,
  PaginatedMatches,
  SimulationResult,
  UpcomingMatch,
} from "@epl/shared";
import {
  liveMatches,
  matchStats,
  odds,
  upcomingMatches,
} from "../../../drizzle/schema";
import { db } from "../../lib/db";
import { curSeason } from "../../config/map";
import {
  computeFormScore,
  computeTeamStats,
  get_standings,
  get_team_data,
  getHeadToHeadBias,
  poissonRandom,
} from "../../config/simulation";

export const PAGE_SIZE = 5;

const previewColumns = {
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
};

const involves = (team: string) =>
  or(eq(matchStats.homeTeam, team), eq(matchStats.awayTeam, team));

export const getMatchStatsService = async (
  ids: number[],
): Promise<MatchStats[]> => {
  const rows = await db
    .select()
    .from(matchStats)
    .where(inArray(matchStats.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
};

export const getUpcomingMatchesService = async (): Promise<UpcomingMatch[]> => {
  const now = new Date().toISOString();
  return await db
    .select()
    .from(upcomingMatches)
    .where(gt(upcomingMatches.matchDate, now))
    .orderBy(asc(upcomingMatches.matchDate));
};

export const getPastMatchesService = (): Promise<MatchPreview[]> => {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  since.setHours(0, 0, 0, 0);
  return db
    .select(previewColumns)
    .from(matchStats)
    .where(gt(matchStats.matchDate, since.toISOString()));
};

export const getOddsService = async (matchId: number): Promise<Odds[]> => {
  return await db.select().from(odds).where(eq(odds.match, matchId));
};

export const getUpcomingMatchByIdService = async (
  id: number,
): Promise<UpcomingMatch | null> => {
  const [row] = await db
    .select()
    .from(upcomingMatches)
    .where(eq(upcomingMatches.id, id))
    .limit(1);
  return row ?? null;
};

// Matches involving the team, newest first, from `offset` onwards
export const getRecentMatchesService = async (
  team: string,
  offset: number,
  limit: number,
): Promise<PaginatedMatches> => {
  const [matches, [totalRow]] = await Promise.all([
    db
      .select(previewColumns)
      .from(matchStats)
      .where(involves(team))
      .orderBy(desc(matchStats.matchDate), desc(matchStats.id))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(matchStats).where(involves(team)),
  ]);

  return { matches, total: totalRow?.total ?? 0 };
};

// Page-based version for the routes that still use pages
export const getTeamMatchesService = async (
  team: string,
  page = 0,
): Promise<PaginatedMatches> => {
  return getRecentMatchesService(team, page * PAGE_SIZE, PAGE_SIZE);
};

export const getTeamMatchStatsService = (
  team: string,
): Promise<MatchStats[]> => {
  const start = new Date(Date.UTC(Number(curSeason), 7, 1));
  const end = new Date(Date.UTC(Number(curSeason) + 1, 6, 1));
  return db
    .select()
    .from(matchStats)
    .where(
      and(
        gt(matchStats.matchDate, start.toISOString()),
        lt(matchStats.matchDate, end.toISOString()),
        involves(team),
      ),
    );
};

export const getLast5MatchStatsService = async (
  team: string,
  page = 0,
): Promise<{ matches: MatchStats[]; total: number }> => {
  const [matches, [totalRow]] = await Promise.all([
    db
      .select()
      .from(matchStats)
      .where(involves(team))
      .orderBy(desc(matchStats.matchDate))
      .limit(PAGE_SIZE)
      .offset(page * PAGE_SIZE),
    db.select({ total: count() }).from(matchStats).where(involves(team)),
  ]);
  return { matches, total: totalRow?.total ?? 0 };
};

export const getSimulationService = async (
  homeTeam: string,
  awayTeam: string,
  season: string = curSeason,
  nSimulations = 10000,
): Promise<SimulationResult | null> => {
  const [matches, standingsRows, h2hBias] = await Promise.all([
    get_team_data(homeTeam, awayTeam),
    get_standings(homeTeam, awayTeam, season),
    getHeadToHeadBias(homeTeam, awayTeam),
  ]);
  const teamStats = computeTeamStats(matches);

  // By team name; if get_standings returns several rows per team, the last one wins, as before
  const standingByTeam = new Map(standingsRows.map((r) => [r.name, r]));
  const home = standingByTeam.get(homeTeam);
  const away = standingByTeam.get(awayTeam);
  const homeStats = teamStats[homeTeam];
  const awayStats = teamStats[awayTeam];
  if (!home || !away || !homeStats || !awayStats) return null;

  const maxPoints = Math.max(...standingsRows.map((r) => r.points ?? 0), 1);
  const homePoints = (home.points ?? 0) / maxPoints;
  const awayPoints = (away.points ?? 0) / maxPoints;
  const homeFormScore = computeFormScore(home.form);
  const awayFormScore = computeFormScore(away.form);

  // Expected scoring rates
  let lamHome = (homeStats.avg_scored_home + awayStats.avg_conceded_away) / 2;
  let lamAway = (awayStats.avg_scored_away + homeStats.avg_conceded_home) / 2;

  // Adjust by points
  lamHome *= 1 + (homePoints - awayPoints) * 0.2;
  lamAway *= 1 + (awayPoints - homePoints) * 0.2;

  // Adjust by points per game
  lamHome *= 1 + ((home.points ?? 0) / ((home.played || 1) * 3) - 0.5) * 0.2;
  lamAway *= 1 + ((away.points ?? 0) / ((away.played || 1) * 3) - 0.5) * 0.2;

  // Adjust by recent form
  lamHome *= 1 + (homeFormScore - awayFormScore) * 0.2;
  lamAway *= 1 + (awayFormScore - homeFormScore) * 0.2;

  // Head-to-head bias
  lamHome *= 1 + h2hBias;
  lamAway *= 1 - h2hBias;

  // Run the simulations, counting results and scores as we go
  let homeWins = 0;
  let draws = 0;
  let totalHome = 0;
  let totalAway = 0;
  const scoreCounts = new Map<string, number>();
  for (let i = 0; i < nSimulations; i++) {
    const h = poissonRandom(lamHome);
    const a = poissonRandom(lamAway);
    if (h > a) homeWins++;
    else if (h === a) draws++;
    totalHome += h;
    totalAway += a;
    const key = `${h}-${a}`;
    scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);
  }

  let mostLikelyScore = "0-0";
  let mostLikelyCount = 0;
  for (const [score, n] of scoreCounts) {
    if (n > mostLikelyCount) [mostLikelyScore, mostLikelyCount] = [score, n];
  }

  return {
    home_team: homeTeam,
    away_team: awayTeam,
    home_win_prob: homeWins / nSimulations,
    draw_prob: draws / nSimulations,
    away_win_prob: (nSimulations - homeWins - draws) / nSimulations,
    avg_goals_home: totalHome / nSimulations,
    avg_goals_away: totalAway / nSimulations,
    lambda_home: lamHome,
    lambda_away: lamAway,
    most_likely_score: mostLikelyScore,
    most_likely_score_prob: mostLikelyCount / nSimulations,
  };
};

export const getHomeAwayMatchesService = async (
  homeTeam: string,
  awayTeam: string,
): Promise<HomeAwayMatches> => {
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

export const deleteLiveMatch = async (espnId: string): Promise<boolean> => {
  const deleted = await db
    .delete(liveMatches)
    .where(eq(liveMatches.espnId, espnId));
  return deleted.length > 0;
};

export const getLiveMatchIds = async (): Promise<Set<string>> => {
  const rows = await db.select({ id: liveMatches.espnId }).from(liveMatches);
  return new Set(rows.map((r) => r.id));
};

export async function deleteStaleLiveMatches(): Promise<number> {
  const sixHoursAgo = new Date(Date.now() - 21_600_000).toISOString();
  const deleted = await db
    .delete(liveMatches)
    .where(lt(liveMatches.kickoff, sixHoursAgo))
    .returning({ espnId: liveMatches.espnId });
  return deleted.length;
}

export async function getLiveMatchesService(): Promise<LiveMatch[]> {
  return await db
    .select()
    .from(liveMatches)
    .orderBy(asc(liveMatches.kickoff), asc(liveMatches.homeTeam));
}

export async function getLiveMatchService(
  espnId: string,
): Promise<LiveMatch | null> {
  const [row] = await db
    .select()
    .from(liveMatches)
    .where(eq(liveMatches.espnId, espnId));
  return row;
}

export async function getMatchIdByEspnIdService(
  espnId: string,
): Promise<number | null> {
  const [row] = await db
    .select({ id: matchStats.id })
    .from(matchStats)
    .where(eq(matchStats.espnId, espnId));
  return row?.id ?? null;
}
