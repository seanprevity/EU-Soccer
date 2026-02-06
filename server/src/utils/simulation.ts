import { and, eq, gte, or } from "drizzle-orm";
import { head2Head, matchStats, standings } from "../../drizzle/schema";
import { db } from "../lib/db";
import { curSeason } from "./map";

type MatchRow = typeof matchStats.$inferSelect;

type TeamStats = Record<
  string,
  {
    avg_scored_home: number;
    avg_scored_away: number;
    avg_conceded_home: number;
    avg_conceded_away: number;
  }
>;

// Poisson random generator
export const poissonRandom = (lambda: number): number => {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  while (p > L) {
    k++;
    p *= Math.random();
  }
  return k - 1;
};

export const mean = (arr: number[]): number =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

export const get_team_data = async (
  homeTeam: string,
  awayTeam: string
): Promise<MatchRow[]> => {
  const seasonStart = new Date(Date.UTC(parseInt(curSeason), 7, 1, 0, 0, 0));
  return await db
    .select()
    .from(matchStats)
    .where(
      and(
        gte(matchStats.matchDate, seasonStart.toISOString()),
        or(
          eq(matchStats.homeTeam, homeTeam),
          eq(matchStats.awayTeam, homeTeam),
          eq(matchStats.homeTeam, awayTeam),
          eq(matchStats.awayTeam, awayTeam)
        )
      )
    );
};

export const computeTeamStats = (matches: MatchRow[]): TeamStats => {
  const stats: Record<
    string,
    {
      scored_home: number[];
      scored_away: number[];
      conceded_home: number[];
      conceded_away: number[];
    }
  > = {};

  for (const match of matches) {
    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;
    const fthg = match.fthg;
    const ftag = match.ftag;

    if (!stats[homeTeam])
      stats[homeTeam] = {
        scored_home: [],
        scored_away: [],
        conceded_home: [],
        conceded_away: [],
      };
    if (!stats[awayTeam])
      stats[awayTeam] = {
        scored_home: [],
        scored_away: [],
        conceded_home: [],
        conceded_away: [],
      };

    stats[homeTeam].scored_home.push(fthg ?? 0);
    stats[homeTeam].conceded_home.push(ftag ?? 0);

    stats[awayTeam].scored_away.push(ftag ?? 0);
    stats[awayTeam].conceded_away.push(fthg ?? 0);
  }

  const teamStats: TeamStats = {};
  for (const team in stats) {
    const t = stats[team];
    teamStats[team] = {
      avg_scored_home: mean(t.scored_home),
      avg_scored_away: mean(t.scored_away),
      avg_conceded_home: mean(t.conceded_home),
      avg_conceded_away: mean(t.conceded_away),
    };
  }

  return teamStats;
};

// returns home, away, and total standings for both home and away teams
export const get_standings = async (
  homeTeam: string,
  awayTeam: string,
  season: string
) => {
  return await db
    .select()
    .from(standings)
    .where(
      and(
        eq(standings.season, curSeason),
        or(eq(standings.name, homeTeam), eq(standings.name, awayTeam))
      )
    );
};

// Compute recent form score (last 5 matches W/D/L)
export const computeFormScore = (form: string | null | undefined): number => {
  if (!form) return 0.5;

  const mapping: Record<string, number> = { W: 3, D: 1, L: 0 };
  const last5 = form.slice(-5).split("");
  const scores = last5.map((ch) => mapping[ch] ?? 0);
  return scores.reduce((a, b) => a + b, 0) / 15;
};

// Compute mild historical head-to-head bias
export const getHeadToHeadBias = async (
  homeTeam: string,
  awayTeam: string
): Promise<number> => {
  const [team1, team2] = [homeTeam, awayTeam].sort();

  const rows = await db
    .select()
    .from(head2Head)
    .where(and(eq(head2Head.team1, team1), eq(head2Head.team2, team2)));

  if (rows.length === 0) return 0;

  const h2h = rows[0];
  const team1Wins = h2h.team1Wins ?? 0;
  const team2Wins = h2h.team2Wins ?? 0;
  const draws = h2h.draws ?? 0;
  const total = team1Wins + team2Wins + draws;
  if (total === 0) return 0;

  let bias: number;
  if (homeTeam === team1) {
    bias = (team1Wins - team2Wins) / total;
  } else {
    bias = (team2Wins - team1Wins) / total;
  }

  // Mild scaling to 20% max influence
  return Math.max(Math.min(bias * 0.2, 0.2), -0.2);
};
